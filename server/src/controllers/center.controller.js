const { randomUUID } = require('crypto');
const { fromBuffer } = require('file-type');

const prisma = require('../config/db');
const { geocodePincode } = require('../utils/geocode');
const {
  uploadPublicImage,
  deletePublicImage,
  extractStoragePath,
} = require('../utils/storage');
const { reencodeToWebp } = require('../utils/imageProcessing');
const {
  updateCenterSchema,
  listAnimalsQuerySchema,
  createAnimalSchema,
  updateAnimalSchema,
  updateAnimalStatusSchema,
  uuidParam,
} = require('../validators/center.validators');

// ── Photo validation helpers ───────────────────────────────────────────────────
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate an uploaded file from req.file.
 * Returns { ok: true } or { ok: false, error: string }
 * Checks real MIME from buffer (not extension), and size.
 */
async function validateImageFile(file) {
  if (!file) {
    return { ok: false, error: 'A photo is required.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: 'Photo must be 5 MB or smaller.' };
  }
  const detected = await fromBuffer(file.buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.includes(detected.mime)) {
    return { ok: false, error: 'Photo must be a JPG, PNG, or WebP image.' };
  }
  return { ok: true };
}

// ── GET /api/center ────────────────────────────────────────────────────────────
async function getCenter(req, res) {
  // req.center is already loaded fresh by requireCenterAdmin middleware
  const center = req.center;

  // Compute profile_complete
  const profile_complete = Boolean(center.description && center.photo_url);

  // Compute animal_count (non-removed animals for this center)
  const animal_count = await prisma.animal.count({
    where: {
      center_id: center.id,
      status: { not: 'removed' },
    },
  });

  return res.status(200).json({
    center: {
      id: center.id,
      name: center.name,
      address: center.address,
      city: center.city,
      pincode: center.pincode,
      latitude: center.latitude,
      longitude: center.longitude,
      contact_email: center.contact_email,
      phone: center.phone,
      description: center.description,
      photo_url: center.photo_url,
      status: center.status,
      rejection_reason: center.rejection_reason,
      profile_complete,
      animal_count,
    },
  });
}

// ── PATCH /api/center ──────────────────────────────────────────────────────────
async function updateCenter(req, res) {
  // Strict validation: unknown fields (status, id, verification_doc_url, etc.) rejected with 400
  const parsed = updateCenterSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Zod "unrecognized_keys" gives us the bad key names
    if (issue.code === 'unrecognized_keys') {
      return res.status(400).json({
        error: `Unknown field(s) not allowed: ${issue.keys.join(', ')}.`,
      });
    }
    return res.status(400).json({ error: issue.message });
  }

  const data = parsed.data;
  const center = req.center;

  // Validate lat/lng must come together
  const hasLat = data.latitude !== undefined && data.latitude !== null;
  const hasLng = data.longitude !== undefined && data.longitude !== null;
  if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
    return res.status(400).json({ error: 'Latitude and longitude must be provided together.' });
  }

  // Determine update data
  const updateData = { ...data };
  let location_warning = null;

  // Geocode if pincode changed and no manual coordinates given
  if (data.pincode && data.pincode !== center.pincode && !hasLat) {
    const geo = await geocodePincode(data.pincode);
    if (geo) {
      updateData.latitude = geo.latitude;
      updateData.longitude = geo.longitude;
    } else {
      // Keep existing coordinates, add a warning
      location_warning =
        "We couldn't find coordinates for this pincode. Distance sorting may be off. You can enter latitude and longitude manually.";
      // Don't set lat/lng in updateData – keep existing
    }
  }

  try {
    const updated = await prisma.center.update({
      where: { id: center.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        pincode: true,
        latitude: true,
        longitude: true,
        contact_email: true,
        phone: true,
        description: true,
        photo_url: true,
        status: true,
        rejection_reason: true,
      },
    });

    const profile_complete = Boolean(updated.description && updated.photo_url);

    const response = { center: { ...updated, profile_complete } };
    if (location_warning) response.location_warning = location_warning;

    return res.status(200).json(response);
  } catch (err) {
    console.error('updateCenter error:', err.message);
    return res.status(500).json({ error: 'Failed to update center. Please try again.' });
  }
}

// ── POST /api/center/photo ─────────────────────────────────────────────────────
async function updateCenterPhoto(req, res) {
  const center = req.center;

  // Validate photo
  const validation = await validateImageFile(req.file);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  // Re-encode to WebP
  let webpBuffer;
  try {
    webpBuffer = await reencodeToWebp(req.file.buffer);
  } catch (err) {
    console.error('updateCenterPhoto: re-encode failed:', err.message);
    return res.status(500).json({ error: 'Failed to process the image. Please try again.' });
  }

  const newFilename = `centers/${center.id}/${randomUUID()}.webp`;

  // Upload new photo
  let newPhotoUrl;
  try {
    newPhotoUrl = await uploadPublicImage(webpBuffer, newFilename, 'image/webp');
  } catch (err) {
    console.error('updateCenterPhoto: upload failed:', err.message);
    return res.status(500).json({ error: 'Failed to upload photo. Please try again.' });
  }

  // Save to DB
  const oldPhotoUrl = center.photo_url;
  try {
    await prisma.center.update({
      where: { id: center.id },
      data: { photo_url: newPhotoUrl },
    });
  } catch (err) {
    // Upload succeeded but DB failed — clean up uploaded file best-effort
    deletePublicImage(newFilename).catch(() => {});
    console.error('updateCenterPhoto: DB update failed:', err.message);
    return res.status(500).json({ error: 'Failed to save photo. Please try again.' });
  }

  // Delete old photo from storage (best-effort, only if it's this center's own file)
  if (oldPhotoUrl) {
    const oldPath = extractStoragePath(oldPhotoUrl);
    if (oldPath && oldPath.startsWith(`centers/${center.id}/`)) {
      deletePublicImage(oldPath).catch(() => {});
    }
  }

  return res.status(200).json({ photo_url: newPhotoUrl });
}

// ── GET /api/center/animals ────────────────────────────────────────────────────
async function listAnimals(req, res) {
  const parsed = listAnimalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid status filter. Use: available, pending_pickup, adopted, removed, or all.',
    });
  }

  const { status } = parsed.data;
  const center = req.center;

  // Determine status filter
  let statusFilter;
  if (!status || status === undefined) {
    // Default: all except removed
    statusFilter = { not: 'removed' };
  } else if (status === 'all') {
    statusFilter = undefined; // no filter
  } else {
    statusFilter = status;
  }

  const where = { center_id: center.id };
  if (statusFilter !== undefined) {
    where.status = statusFilter;
  }

  const animals = await prisma.animal.findMany({
    where,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      category: true,
      breed: true,
      age_months: true,
      gender: true,
      size: true,
      good_with_kids: true,
      good_with_pets: true,
      vaccinated: true,
      neutered: true,
      description: true,
      story: true,
      status: true,
      created_at: true,
      photos: {
        select: { url: true },
        take: 1,
        orderBy: { position: 'asc' },
      },
    },
  });

  // Flatten: each animal gets a single photo_url
  const result = animals.map((a) => ({
    ...a,
    photo_url: a.photos[0]?.url ?? null,
    photos: undefined,
  }));

  return res.status(200).json({ animals: result });
}

// ── POST /api/center/animals ───────────────────────────────────────────────────
async function createAnimal(req, res) {
  // 1. Validate text fields FIRST (strict – rejects center_id, status, id etc.)
  const parsed = createAnimalSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.code === 'unrecognized_keys') {
      return res.status(400).json({
        error: `Unknown field(s) not allowed: ${issue.keys.join(', ')}.`,
      });
    }
    return res.status(400).json({ error: issue.message });
  }

  // 2. Validate photo
  const photoValidation = await validateImageFile(req.file);
  if (!photoValidation.ok) {
    return res.status(400).json({ error: photoValidation.error });
  }

  // 3. Generate animal ID
  const animalId = randomUUID();

  // 4. Re-encode and upload photo
  let webpBuffer;
  try {
    webpBuffer = await reencodeToWebp(req.file.buffer);
  } catch (err) {
    console.error('createAnimal: re-encode failed:', err.message);
    return res.status(500).json({ error: 'Failed to process the photo. Please try again.' });
  }

  const photoFilename = `animals/${animalId}/${randomUUID()}.webp`;
  let photoUrl;
  try {
    photoUrl = await uploadPublicImage(webpBuffer, photoFilename, 'image/webp');
  } catch (err) {
    console.error('createAnimal: photo upload failed:', err.message);
    return res.status(500).json({ error: 'Failed to upload photo. Please try again.' });
  }

  // 5. Create animal + photo in ONE transaction
  let animal;
  try {
    animal = await prisma.$transaction(async (tx) => {
      const created = await tx.animal.create({
        data: {
          id: animalId,
          center_id: req.center.id, // ALWAYS from server, never from body
          name: parsed.data.name,
          category: parsed.data.category,
          breed: parsed.data.breed,
          age_months: parsed.data.age_months,
          gender: parsed.data.gender,
          size: parsed.data.size,
          good_with_kids: parsed.data.good_with_kids,
          good_with_pets: parsed.data.good_with_pets,
          vaccinated: parsed.data.vaccinated,
          neutered: parsed.data.neutered,
          description: parsed.data.description,
          story: parsed.data.story ?? null,
          status: 'available', // ALWAYS available on creation; never from body
        },
        select: {
          id: true,
          name: true,
          category: true,
          breed: true,
          age_months: true,
          gender: true,
          size: true,
          good_with_kids: true,
          good_with_pets: true,
          vaccinated: true,
          neutered: true,
          description: true,
          story: true,
          status: true,
          created_at: true,
        },
      });

      await tx.animalPhoto.create({
        data: {
          animal_id: animalId,
          url: photoUrl,
          is_primary: true,
          position: 0,
        },
      });

      return created;
    });
  } catch (err) {
    // Transaction failed — delete the uploaded photo best-effort
    deletePublicImage(photoFilename).catch(() => {});
    console.error('createAnimal: transaction failed:', err.message);
    return res.status(500).json({ error: 'Failed to create animal. Please try again.' });
  }

  return res.status(201).json({
    animal: {
      ...animal,
      photo_url: photoUrl,
    },
  });
}

// ── PATCH /api/center/animals/:id ─────────────────────────────────────────────
async function updateAnimal(req, res) {
  // Validate :id
  const paramResult = uuidParam.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid animal ID.' });
  }

  // Validate body (strict, no status, no center_id, no photo fields)
  const parsed = updateAnimalSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.code === 'unrecognized_keys') {
      return res.status(400).json({
        error: `Unknown field(s) not allowed: ${issue.keys.join(', ')}.`,
      });
    }
    return res.status(400).json({ error: issue.message });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const { id } = paramResult.data;

  // Ownership check inside the query itself — never a separate read-then-write
  const result = await prisma.animal.updateMany({
    where: {
      id,
      center_id: req.center.id, // ownership enforced here
      status: { not: 'removed' }, // removed animals can't be edited
    },
    data: parsed.data,
  });

  if (result.count === 0) {
    // Could be: animal not found, or belongs to another center, or is removed
    // Return 404 in all cases (don't reveal whether it exists)
    return res.status(404).json({ error: 'Animal not found.' });
  }

  // Fetch updated record with photo
  const updated = await prisma.animal.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      breed: true,
      age_months: true,
      gender: true,
      size: true,
      good_with_kids: true,
      good_with_pets: true,
      vaccinated: true,
      neutered: true,
      description: true,
      story: true,
      status: true,
      created_at: true,
      photos: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
    },
  });

  return res.status(200).json({
    animal: {
      ...updated,
      photo_url: updated.photos[0]?.url ?? null,
      photos: undefined,
    },
  });
}

// ── DELETE /api/center/animals/:id ────────────────────────────────────────────
//
// Phase 5C: atomic removal + application cancellation.
// ONE prisma.$transaction (15s timeout):
//   (a) updateMany WHERE id AND center_id AND status IN ('available','adopted') → 'removed'.
//       Zero rows = abort; follow-up read picks 409 (pending_pickup) vs 404 (all others).
//   (b) Read PENDING applications for this animal (applicant name, email, animal name,
//       center name), then updateMany → 'cancelled', decided_at = now.
// Returns 200 with cancelled_applications_count.
// After commit: email each applicant one at a time (best-effort, never blocks the response).
async function removeAnimal(req, res) {
  const paramResult = uuidParam.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid animal ID.' });
  }

  const { id } = paramResult.data;
  const centerId = req.center.id;

  let cancelledApplicants = [];
  let blocked = null; // null = not set; 'pending_pickup' = blocked; 'not_found' = 404

  try {
    cancelledApplicants = await prisma.$transaction(
      async (tx) => {
        // (a) Conditional removal: allowed only from 'available' or 'adopted'
        const removed = await tx.animal.updateMany({
          where: {
            id,
            center_id: centerId,
            status: { in: ['available', 'adopted'] },
          },
          data: { status: 'removed' },
        });

        if (removed.count === 0) {
          // Follow-up read to choose the right error — read the status only, not to guard the write
          const existing = await tx.animal.findFirst({
            where: { id, center_id: centerId },
            select: { status: true },
          });
          blocked = existing?.status === 'pending_pickup' ? 'pending_pickup' : 'not_found';
          return [];
        }

        // (b) Read PENDING applications for this animal
        const pending = await tx.application.findMany({
          where: { animal_id: id, status: 'pending' },
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            animal: { select: { name: true } },
            center: { select: { name: true } },
          },
        });

        if (pending.length > 0) {
          await tx.application.updateMany({
            where: { animal_id: id, status: 'pending' },
            data: { status: 'cancelled', decided_at: new Date() },
          });
        }

        return pending.map((a) => ({
          name:       a.user.name,
          email:      a.user.email,
          animalName: a.animal.name,
          centerName: a.center.name,
        }));
      },
      { timeout: 15000 },
    );
  } catch (err) {
    console.error('removeAnimal transaction error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  if (blocked === 'pending_pickup') {
    return res.status(409).json({
      error: 'This animal is awaiting pickup. Mark it adopted or return it to available first.',
    });
  }
  if (blocked === 'not_found') {
    return res.status(404).json({ error: 'Animal not found.' });
  }

  // Transaction committed. Email each cancelled applicant one at a time (best-effort).
  const { getApplicationAnimalRemovedEmail, sendEmail: se } = require('../utils/email');
  for (const applicant of cancelledApplicants) {
    const em = getApplicationAnimalRemovedEmail({
      applicantName: applicant.name,
      animalName:    applicant.animalName,
      centerName:    applicant.centerName,
    });
    await se({ to: applicant.email, ...em }).catch(() => {});
  }

  return res.status(200).json({
    message: 'Animal removed successfully.',
    cancelled_applications_count: cancelledApplicants.length,
  });
}

// ── PATCH /api/center/animals/:id/status ──────────────────────────────────────
//
// Moves an animal from 'pending_pickup' to either 'adopted' or 'available'.
//
// When new status = 'available' (admin returning the animal):
//   Both steps run in ONE transaction (15s timeout):
//   (1) updateMany WHERE id AND center_id AND status = 'pending_pickup' → 'available'.
//       Zero rows = abort; follow-up read picks 404 vs 409.
//   (2) Find approved applications for this animal, then updateMany →
//       status = 'cancelled', decided_at = now.
//   After the commit, email each cancelled applicant one at a time (best-effort).
//
// When new status = 'adopted':
//   Only the animal is updated. The approved application stays 'approved'.
//   No application changes are made.
async function updateAnimalStatus(req, res) {
  const paramResult = uuidParam.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid animal ID.' });
  }

  const parsed = updateAnimalStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { id } = paramResult.data;
  const { status } = parsed.data;
  const centerId = req.center.id;

  if (status === 'available') {
    // ── Return to available: ONE transaction ─────────────────────────────────
    let cancelledApplicants = [];
    let blocked = null; // null = ok; 'not_found' = 404; 'wrong_status' = 409

    try {
      cancelledApplicants = await prisma.$transaction(
        async (tx) => {
          // (1) Atomic conditional animal update — no separate read-then-write
          const animalUpdate = await tx.animal.updateMany({
            where: { id, center_id: centerId, status: 'pending_pickup' },
            data: { status: 'available' },
          });

          if (animalUpdate.count === 0) {
            // Follow-up read only to choose the error message
            const existing = await tx.animal.findFirst({
              where: { id, center_id: centerId },
              select: { status: true },
            });
            blocked = existing ? 'wrong_status' : 'not_found';
            return [];
          }

          // Need animal name for emails — read it now that ownership + status are confirmed
          const animalRecord = await tx.animal.findUnique({
            where: { id },
            select: { name: true },
          });

          // (2) Find then cancel all approved applications for this animal
          const approved = await tx.application.findMany({
            where: { animal_id: id, status: 'approved' },
            select: { id: true, user: { select: { name: true, email: true } } },
          });

          if (approved.length > 0) {
            await tx.application.updateMany({
              where: { animal_id: id, status: 'approved' },
              data: { status: 'cancelled', decided_at: new Date() },
            });
          }

          return approved.map((a) => ({
            name:       a.user.name,
            email:      a.user.email,
            animalName: animalRecord?.name ?? '',
          }));
        },
        { timeout: 15000 },
      );
    } catch (err) {
      console.error('updateAnimalStatus (available) transaction error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    if (blocked === 'not_found') {
      return res.status(404).json({ error: 'Animal not found.' });
    }
    if (blocked === 'wrong_status') {
      return res.status(409).json({
        error: 'Cannot change status: animal is not currently awaiting pickup.',
      });
    }

    // Transaction committed. Email cancelled applicants one at a time (best-effort).
    const { getApplicationCancelledByCenterEmail, sendEmail: se } = require('../utils/email');
    for (const applicant of cancelledApplicants) {
      const ec = getApplicationCancelledByCenterEmail({
        adopterName: applicant.name,
        animalName:  applicant.animalName,
      });
      await se({ to: applicant.email, ...ec }).catch(() => {});
    }

    return res.status(200).json({ message: 'Animal status updated to "available".', status: 'available' });
  }

  // ── Mark as adopted: change only the animal ──────────────────────────────────
  // The approved application stays 'approved'. No application changes.
  const result = await prisma.animal.updateMany({
    where: { id, center_id: centerId, status: 'pending_pickup' },
    data: { status: 'adopted' },
  });

  if (result.count === 0) {
    const exists = await prisma.animal.findFirst({
      where: { id, center_id: centerId },
      select: { id: true, status: true },
    });

    if (!exists) {
      return res.status(404).json({ error: 'Animal not found.' });
    }

    return res.status(409).json({
      error: `Cannot change status: animal is currently "${exists.status}", not "pending_pickup".`,
    });
  }

  return res.status(200).json({
    message: 'Animal status updated to "adopted".',
    status: 'adopted',
  });
}

// ── POST /api/center/animals/:id/photos ────────────────────────────────────────
// Replaces the animal's single photo.
async function replaceAnimalPhoto(req, res) {
  const paramResult = uuidParam.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid animal ID.' });
  }

  const { id } = paramResult.data;

  // 1. Check ownership FIRST (before looking at the file) — so another center's animal
  //    is never revealed by a different error message.
  const animal = await prisma.animal.findFirst({
    where: {
      id,
      center_id: req.center.id,
      status: { not: 'removed' },
    },
    select: { id: true },
  });

  if (!animal) {
    return res.status(404).json({ error: 'Animal not found.' });
  }

  // 2. Validate photo file
  const validation = await validateImageFile(req.file);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  // 3. Re-encode
  let webpBuffer;
  try {
    webpBuffer = await reencodeToWebp(req.file.buffer);
  } catch (err) {
    console.error('replaceAnimalPhoto: re-encode failed:', err.message);
    return res.status(500).json({ error: 'Failed to process the image. Please try again.' });
  }

  // 4. Upload new file
  const newFilename = `animals/${id}/${randomUUID()}.webp`;
  let newPhotoUrl;
  try {
    newPhotoUrl = await uploadPublicImage(webpBuffer, newFilename, 'image/webp');
  } catch (err) {
    console.error('replaceAnimalPhoto: upload failed:', err.message);
    return res.status(500).json({ error: 'Failed to upload photo. Please try again.' });
  }

  // 5. In ONE transaction: delete existing photo row(s), insert new row
  let oldPhotoUrl = null;
  try {
    await prisma.$transaction(async (tx) => {
      // Get the old photo URL before deleting
      const oldPhoto = await tx.animalPhoto.findFirst({
        where: { animal_id: id },
        select: { url: true },
      });
      if (oldPhoto) oldPhotoUrl = oldPhoto.url;

      // Delete all existing photo rows for this animal
      await tx.animalPhoto.deleteMany({ where: { animal_id: id } });

      // Insert new single photo row
      await tx.animalPhoto.create({
        data: {
          animal_id: id,
          url: newPhotoUrl,
          is_primary: true,
          position: 0,
        },
      });
    });
  } catch (err) {
    // Transaction failed — clean up the newly uploaded file, keep old photo
    deletePublicImage(newFilename).catch(() => {});
    console.error('replaceAnimalPhoto: transaction failed:', err.message);
    return res.status(500).json({ error: 'Failed to update photo. Please try again.' });
  }

  // 6. Delete old file from storage (best-effort, only inside animals/<id>/)
  if (oldPhotoUrl) {
    const oldPath = extractStoragePath(oldPhotoUrl);
    if (oldPath && oldPath.startsWith(`animals/${id}/`)) {
      deletePublicImage(oldPath).catch(() => {});
    }
  }

  return res.status(200).json({ photo_url: newPhotoUrl });
}

module.exports = {
  getCenter,
  updateCenter,
  updateCenterPhoto,
  listAnimals,
  createAnimal,
  updateAnimal,
  removeAnimal,
  updateAnimalStatus,
  replaceAnimalPhoto,
};
