# PRD — Furry Tales (Pet Adoption + Food Store Platform)

**Status:** v1 prototype. No demo data: everything is created through the app itself.
**Companion docs:** `furrytales-ui-brief.md` (look and feel) · `furrytales-tech-spec.md` (stack, schema, API, rules). Read all three before building.

---

## 0. Branding
- **Name:** Furry Tales. "Furry" is the animals, "Tales" is their stories. Adoption is the start of a shared story between a person and an animal.
- **Tone:** Warm, trustworthy, emotional on the adoption side. The food store is cleaner and more utilitarian by contrast.

## 0.1 Design Direction (summary; details go in the UI brief)
- **Split-identity sign-in:** the auth screen is two interactive panels instead of a dropdown or toggle.
  - Left: "I'm looking to adopt" (warm, paw-print texture, grows slightly on hover)
  - Right: "I manage a center" (structured, badge/clipboard iconography, grows slightly on hover)
  - Clicking a panel slides it forward into that role's sign-in/sign-up form.
- **Pet cards:** small card = photo, name, age, distance. Click expands smoothly into a detail card with two actions: "View other animals" and "Fill adoption form".
- **Admin side looks different** from the adopter side: a clean dashboard layout (sidebar, tables, forms), not the emotional look.
- **Food store** is visually distinct from the adoption section, with a clean grid and product cards.

## 1. One-Line Summary
Furry Tales connects adoption centers to adopters online. People browse animals sorted by nearest center, apply through an online form, and collect the animal in person. A small food store sits alongside.

## 2. The Problem
Adopting a pet normally means visiting a center, browsing in person, and filling long forms on site. Furry Tales moves browsing and the application online, so the in-person visit is only the final pickup.

## 3. Who It's For (three roles)
- **Adopter:** a pet lover browsing and applying.
- **Center Admin:** staff of an approved center who list animals and handle applications.
- **Platform Owner:** the person running Furry Tales (the founder). Approves or rejects centers, manages the food store, and can suspend a center.

Not for: breeders or anyone selling animals. This is adoption only.

## 4. Core Features (v1)

**Authentication (sign-in first)**
- Everyone signs in before seeing anything. There is no guest browsing in v1 (see Nice-to-Have).
- Split-panel entry routes to the Adopter or Center Admin form.
- Adopter sign-up collects name, email, password, phone, city and pincode. The pincode is turned into coordinates and used for distance sorting.
- Center Admin sign-up creates the account **and** a center profile (see Approval below).

**Center Approval (Platform Owner)**
- A new center starts as **Pending**. Its admin sees a "Pending approval" screen and cannot list animals yet.
- The owner has a panel listing pending centers with their details and verification document. The owner can **Approve**, **Reject** (with a reason) or later **Suspend**.
- Approval and rejection each send an email to the center admin.
- A suspended center's animals are hidden from adopters.

**Center Admin Dashboard**
- Sidebar: Animals · Applications · Center Profile.
- First-time empty state is a checklist: "Complete profile → Add your first animal".
- **Animals:** add, edit and remove listings with multiple photo **uploads**, plus name, category, breed, age, gender, size, temperament tags (good with kids, other pets), vaccinated/neutered, description and a short **story**.
- **Applications:** view applications for their center only, read the full form, and Approve or Reject with an optional note.
- Animal status is managed here: Available → Pending Pickup → Adopted. Admins can revert Pending Pickup to Available if the adopter doesn't show.

**Adopter Experience**
- **Home:** intro, pet category cards (Dogs, Cats, Other), and a link to the Food Store. Photos for the hero and category cards are free-licensed stock photos bundled with the site (static site images, not demo animals). There is no testimonial strip in v1 (see Nice-to-Have).
- **Browse a category:** animals from approved centers only, sorted by distance from the adopter. Basic **filters**: age range, size, gender, good with kids.
- **Cards:** small card (photo, name, age, distance) expands to a detail card (photos, characteristics, story). Detail-card actions: "View other animals", "Add to favorites", "Fill adoption form".
- **Favorites:** save animals and see them on a Favorites page.
- **Adoption form:** a real adoption form (starter field list in Section 10). On submit, an email goes to the center and a confirmation email goes to the adopter. The application is saved.
- **My Applications:** the adopter sees every application with its status (Pending, Approved, Rejected, Not selected, Cancelled), can withdraw a pending application, and gets an email when it changes.

**Food Store**
- One platform-wide store, managed by the Platform Owner (default; see Section 10).
- Product list with categories, search, price and stock. The cart lives in the browser until checkout. Adopters place orders (pay on delivery/pickup, no payment gateway in v1).
- The owner adds and edits products, including uploading product images.
- Out-of-stock items can't be ordered, and stock can never go negative.

## 5. Nice-to-Have (Later, Not v1)
- **Happy Tales:** a section where adopted animals get a follow-up story and photos from their new family. (v1 already stores a `story` field per animal to prepare for this.)
- **Guest browsing:** browse before signing in, and require login only to apply. Deliberately left out of v1. The data model supports adding it later.
- **Visit slot picker** in the adoption form.
- **Testimonial strip** on the home page, added only once there are real words from real adopters. No invented testimonials.
- Live GPS location (v1 uses the pincode given at sign-up).
- Owner analytics dashboard (applications over time, popular animals).
- In-app messaging between adopter and center.
- Real payment gateway for the store.
- Lifestyle matching or recommendations.

## 6. Explicitly Out of Scope (v1)
- Buying or selling animals; breeder accounts.
- Guest (logged-out) browsing.
- Payment gateway.
- Real-time chat.
- Automated animal recommendations.
- Native mobile app (responsive web only).
- Demo or seed animals and centers. The only seeded record is the owner account (see Section 11). Bundled stock photos on the home page are static images, not demo data.
- Invented testimonials.

## 7. User Flows

**Adopter:** sign in via the adopt panel → home → category → animals sorted by distance (apply filters) → expand a card → favorite or fill the form → submit → confirmation email → track under My Applications → email when a center decides.

**Center Admin (new):** sign up via the center panel + center profile → "Pending approval" → owner approves → dashboard checklist → add animals (photo upload) → receive applications → approve or reject → mark animal adopted after pickup.

**Platform Owner:** sign in (owner account) → review pending centers → approve or reject → manage products and orders in the store.

## 8. Data / What Needs to Be Stored (summary; full schema in the tech spec)
Users (with role: adopter, center_admin or owner) · Centers (with approval status) · Animals · Animal Photos · Applications (form data plus status) · Favorites · Products · Orders · Order Items.

Photos are files in image storage. The database holds only their URLs.

## 9. Success Looks Like
- I can test the whole system alone using three accounts (owner, center admin, adopter) and no demo data.
- A new center can register, be approved by me, and list an animal in under 5 minutes.
- An adopter can go from sign-in to submitted application in under 5 minutes.
- Two adopters applying for the same animal never leads to the animal being approved for both.
- Last-stock purchases never oversell.
- An admin can never see or change another center's animals or applications.

## 10. Decisions and Open Questions
**Resolved**
- Centers are approval-based, with the Platform Owner as a third role.
- Sign-in comes first; no guest browsing in v1.
- No demo data; admin upload is built from the start.
- v1 includes My Applications, Favorites, basic filters and the animal `story` field.
- Home-page photos are bundled free-licensed stock images. No testimonials in v1.

**Defaults I'm assuming (change any of these before building)**
- **Store ownership:** one platform-wide store run by the owner. Centers do not manage food stock.
- **Payments:** pay on delivery/pickup, no gateway.
- **Distance:** computed from coordinates (Haversine formula). Adopters give a pincode at sign-up. Centers give an address and pincode at registration.

**Starter field list for the adoption form (refine against a real shelter's form)**
- Applicant: full name, phone, email (prefilled), address, confirmation of age 18+
- Home: house or apartment, owned or rented, landlord permission (if rented), outdoor space
- Household: number of adults, children (ages), other pets
- Experience: pets owned before, hours the pet would be alone daily
- Motivation and care: why adopting, who will care for the pet, vet-care commitment
- Consent: agreement to a home or center visit and to the center's adoption policy

## 11. Testing as Owner, Admin and Adopter (no demo data)
- A one-time **seed script** creates only the **owner account**, using an email and password from `.env`.
- Create the other two accounts through the real sign-up screens, using different emails. Gmail `+` aliases work for this (`yourname+admin@gmail.com`, `yourname+user@gmail.com` all reach the same inbox).
- Use a normal window for one role and an incognito window for another to be logged into two roles at once.

## 12. Build Plan (phases)
Build in this order. **Give the AI one phase at a time**, test the acceptance check, commit to Git, then move on. Never ask for the whole site at once.

| Phase | Build | Done when |
|---|---|---|
| 0 | Project setup: repo, stack from the tech spec, `.env`, database connection, design tokens from the UI brief, owner seed script | App runs locally, DB connects, owner account exists |
| 1 | Auth and roles: split-panel UI (with a simple static placeholder illustration), adopter and admin sign-up/login, logout, role-protected routes, center profile creation, Pending screen | Each role lands on its own page and can't open the others' pages |
| 2 | Owner panel: list pending centers, approve/reject with email | Approving a center unlocks its admin dashboard |
| 3 | Admin animals: add/edit/remove with photo upload, own-center-only access | An admin's animal appears in the database with its photo, and a second admin can't touch it |
| 4 | Adopter browse: home, categories, distance sort, filters, card expand, detail card | Animals from approved centers show nearest first |
| 5 | Applications: form, emails, admin review, animal status change, My Applications | Approving one application puts the animal on Pending Pickup, hides it from others and marks competing applications Not selected |
| 6 | Favorites | Save/unsave works and persists |
| 7 | Food store: owner product management (with image upload), browser-side cart, orders (adopters only), atomic stock | Two simultaneous orders for the last item can't both succeed |
| 8 | Security pass, error pages, polish, **animated login scene** (see UI brief), deployment | Security checklist in the tech spec passes; the animated login scene works on phone and desktop and respects reduced-motion settings; the site is live |

**Instructions for the AI agent:** read this PRD, the UI brief and the tech spec at the start of every phase. Don't build features from later phases early. At the end of each phase, list what was built and how to test it.
