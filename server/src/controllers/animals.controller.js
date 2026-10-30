const prisma = require('../config/db');
const { haversineKm } = require('../utils/distance');
const {
  listPublicAnimalsQuerySchema,
  uuidParamSchema,
} = require('../validators/animals.validators');

/**
 * Helper to check whether coordinate is a valid non-null number within standard bounds.
 * (0 is valid!)
 */
function isValidCoord(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false;
  }
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (isNaN(nLat) || isNaN(nLon)) return false;
  return nLat >= -90 && nLat <= 90 && nLon >= -180 && nLon <= 180;
}

/**
 * GET /api/animals
 * Adopter and logged-in users browsing animals.
 * Strict query validation, explicit select, DB visibility filter, distance calculation,
 * sorting, offset/limit, Cache-Control: no-store.
 */
async function listAnimals(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const parsed = listPublicAnimalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    let msg = firstIssue.message;
    if (firstIssue.code === 'unrecognized_keys') {
      msg = `Unknown parameter(s) not allowed: ${firstIssue.keys.join(', ')}.`;
    }
    return res.status(400).json({ error: msg });
  }

  const {
    category,
    ageMin,
    ageMax,
    size,
    gender,
    goodWithKids,
    limit,
    offset,
  } = parsed.data;

  // Build Prisma where clause
  // VISIBILITY RULE: animal.status = 'available' AND center.status = 'approved'
  const where = {
    status: 'available',
    center: {
      status: 'approved',
    },
  };

  if (category) {
    where.category = category;
  }
  if (size) {
    where.size = size;
  }
  if (gender) {
    where.gender = gender;
  }
  if (goodWithKids === 'true') {
    where.good_with_kids = true;
  }

  // Age filter (age_months in whole months)
  if (ageMin !== undefined || ageMax !== undefined) {
    where.age_months = {};
    if (ageMin !== undefined) {
      where.age_months.gte = ageMin;
    }
    if (ageMax !== undefined) {
      where.age_months.lte = ageMax;
    }
  }

  // Fetch at most 1000 matching rows.
  // Comment: Cap of 1000 is a v1 limit for in-memory distance calculation and sorting.
  const MAX_FETCH_CAP = 1000;

  const rows = await prisma.animal.findMany({
    where,
    take: MAX_FETCH_CAP,
    select: {
      id: true,
      name: true,
      category: true,
      age_months: true,
      gender: true,
      size: true,
      center: {
        select: {
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      },
      photos: {
        select: { url: true },
        take: 1,
        orderBy: { position: 'asc' },
      },
    },
  });

  const total = rows.length;

  // User location check
  const userLat = req.user?.latitude;
  const userLon = req.user?.longitude;
  const userHasLocation = isValidCoord(userLat, userLon);

  // Compute distance for each animal
  const mapped = rows.map((a) => {
    let distance_km = null;
    const centerLat = a.center?.latitude;
    const centerLon = a.center?.longitude;

    if (userHasLocation && isValidCoord(centerLat, centerLon)) {
      const d = haversineKm(
        Number(userLat),
        Number(userLon),
        Number(centerLat),
        Number(centerLon)
      );
      distance_km = Math.round(d * 10) / 10;
    }

    return {
      id: a.id,
      name: a.name,
      category: a.category,
      age_months: a.age_months,
      gender: a.gender,
      size: a.size,
      photo_url: a.photos[0]?.url ?? null,
      distance_km,
      center_name: a.center?.name ?? '',
      center_city: a.center?.city ?? '',
    };
  });

  // Sorting:
  // If user HAS location: sort by distance ascending with unknown distances last,
  // ties broken by name (case-insensitive) then id.
  // If user has NO location: sort alphabetically by name (case-insensitive) then id.
  mapped.sort((a, b) => {
    if (userHasLocation) {
      const aDist = a.distance_km;
      const bDist = b.distance_km;
      const aHasDist = aDist !== null;
      const bHasDist = bDist !== null;

      if (aHasDist && !bHasDist) return -1;
      if (!aHasDist && bHasDist) return 1;
      if (aHasDist && bHasDist && aDist !== bDist) {
        return aDist - bDist;
      }
    }

    // Name tie-breaker (case-insensitive)
    const nameComp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameComp !== 0) return nameComp;

    // Id tie-breaker
    return a.id.localeCompare(b.id);
  });

  // Apply pagination
  const paginated = mapped.slice(offset, offset + limit);

  return res.status(200).json({
    animals: paginated,
    total,
    has_location: userHasLocation,
  });
}

/**
 * GET /api/animals/:id
 * Animal detail for adopter and logged-in users.
 * Validates UUID. Applies SAME visibility rule.
 * Returns 404 { "error": "Animal not found" } on non-existent or hidden animal.
 * Detail fields only. Cache-Control: no-store.
 */
async function getAnimal(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: 'Invalid animal ID format.' });
  }

  const animalId = idParsed.data;

  // VISIBILITY RULE: status 'available' AND center.status 'approved'
  const animal = await prisma.animal.findFirst({
    where: {
      id: animalId,
      status: 'available',
      center: {
        status: 'approved',
      },
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
      center: {
        select: {
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      },
      photos: {
        select: { url: true },
        take: 1,
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!animal) {
    return res.status(404).json({ error: 'Animal not found' });
  }

  // Calculate distance
  const userLat = req.user?.latitude;
  const userLon = req.user?.longitude;
  const userHasLocation = isValidCoord(userLat, userLon);

  let distance_km = null;
  const centerLat = animal.center?.latitude;
  const centerLon = animal.center?.longitude;

  if (userHasLocation && isValidCoord(centerLat, centerLon)) {
    const d = haversineKm(
      Number(userLat),
      Number(userLon),
      Number(centerLat),
      Number(centerLon)
    );
    distance_km = Math.round(d * 10) / 10;
  }

  // Response: exactly the detail fields from decisions
  return res.status(200).json({
    id: animal.id,
    name: animal.name,
    category: animal.category,
    age_months: animal.age_months,
    gender: animal.gender,
    size: animal.size,
    photo_url: animal.photos[0]?.url ?? null,
    distance_km,
    center_name: animal.center?.name ?? '',
    center_city: animal.center?.city ?? '',
    breed: animal.breed,
    good_with_kids: animal.good_with_kids,
    good_with_pets: animal.good_with_pets,
    vaccinated: animal.vaccinated,
    neutered: animal.neutered,
    description: animal.description,
    story: animal.story,
    status: animal.status,
  });
}

module.exports = {
  listAnimals,
  getAnimal,
};
