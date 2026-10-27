# UI Design Brief — Furry Tales

## 1. Personality in Three Words

- Warm
- Trustworthy
- Playful

The adoption experience should feel emotional and welcoming, while the food store should feel clean and practical. The admin experience should feel organised and professional.

---

## 2. Reference Sites / Apps

1. **Airbnb — https://www.airbnb.com/**
   - Inspiration: Spacious layouts, beautiful photography, clean search interfaces, rounded cards, and intuitive interactions.
   - Apply these ideas to animal discovery and profile cards.

2. **Petfinder — https://www.petfinder.com/**
   - Inspiration: Animal adoption focus, animal profiles, and helping people discover pets that suit them.
   - Use this as inspiration for the adoption journey, but give Furry Tales a more distinctive and modern visual identity.

3. **Linear — https://linear.app/**
   - Inspiration: Clean dashboards, consistent spacing, restrained colours, and polished interactions.
   - Apply these principles to the Center Admin dashboard and Platform Owner panel.

Do not directly copy these websites. Use them as references for individual design principles.

---

## 3. Colors

| Role | Your idea | Hex |
|---|---|---|
| Background | Warm ivory | `#FAF7F2` |
| Main text | Deep charcoal-brown | `#292720` |
| Primary (buttons) | Deep terracotta, white text passes contrast (5.41:1) | `#A95032` |
| Primary light (large headings and decoration only, never small text) | Warm terracotta orange | `#C96B45` |
| Accent | Muted sage green and soft blush pink | `#A8B59A` / `#F3DCD5` |
| Success | Accessible green | `#28784A` |
| Warning | Dark amber | `#946200` |
| Error | Deep muted red | `#B42332` |
| Admin side | Light grey background with forest-green accents | `#F4F5F6` / `#355C4A` |

Additional colours:
- Card background: `#FFFFFF`
- Border: `#E8E0D6`
- Muted text: `#6B675F` (darkened for contrast, 5.27:1 on ivory)
- Primary button hover: `#8F4228`

### Colour guidelines
- The adoption side should use warm ivory, terracotta, sage green, and natural photography.
- The food store should use clean white surfaces, neutral backgrounds, and terracotta action buttons.
- Admin pages should use neutral backgrounds, forest-green accents, and restrained status colours.
- Avoid excessive gradients and too many competing accent colours.
- Contrast rule: white text on buttons uses `#A95032` or darker. Use `#C96B45` only for large headings and decoration, never for small text or small white-on-colour labels.

---

## 4. Typography

- **Headings feel like:** Rounded, friendly, expressive, and modern.
- **Body text feels like:** Clean, simple, and easy to read.
- **Recommended heading font:** Nunito.
- **Recommended body font:** Inter.
- **Avoid:** Cartoon fonts, overly decorative typefaces, excessive font variations, and tiny text.

Headings should communicate warmth and personality without making the platform look childish.

---

## 5. Shape and Depth

- **Corners:** Moderately rounded, approximately 16–22px for cards.
- **Shadows:** Soft and natural, becoming slightly stronger on hover.
- **Spacing:** Airy and spacious on adopter-facing pages; compact but comfortable on administrative pages.

Buttons and inputs should have consistent corner radii. Use pill-shaped buttons selectively for prominent calls to action.

The overall design should feel modern, welcoming, and polished rather than overly rounded or excessively decorative.

---

## 6. Key Components

### Buttons
- Primary buttons use deep terracotta (`#A95032`) backgrounds with white text.
- Secondary buttons use neutral backgrounds or subtle borders.
- Use clear labels such as "Find Your Companion", "Apply to Adopt", "Add to Favorites", and "Submit Application".
- Include hover, focus, pressed, disabled, and loading states.
- Add subtle paw or heart micro-animations to relevant actions.
- Keep animations short and responsive.

### Animal Card — Small
- Large, high-quality animal photograph.
- Animal name.
- Age.
- Distance from the adopter.
- Favourite heart button.
- Availability badge when relevant.

Cards should have consistent dimensions, rounded corners, and subtle shadows. On hover, the card lifts slightly and the photograph may zoom in gently.

Clicking the card expands it in place. Clicking the favourite button should not accidentally expand the card.

### Animal Card — Expanded
- Expand smoothly within the existing animal grid.
- Display the main photograph and additional animal photographs.
- Show the animal's name, age, breed, gender, size, and other available characteristics.
- Display temperament tags, vaccination information, and the animal's story when provided.
- Clearly show the animal's current status.

Include these three actions, as specified by the PRD:
1. View Other Animals.
2. Add to Favorites.
3. Fill Adoption Form.

The expanded card should preserve the user's browsing context and collapse smoothly. On mobile, it should adapt to the screen width without overflowing.

### Forms and Inputs
- Clear labels and descriptions.
- Consistent spacing and input sizes.
- Visible focus states.
- Inline validation and understandable error messages.
- Clear required-field indicators.
- Friendly confirmation messages.
- Preserve entered data when navigating between form steps.

The adoption form should be divided into logical sections or steps so that it feels manageable rather than overwhelming.

### Navigation Bar
- Furry Tales logo with a subtle paw symbol.
- Home.
- Find a Friend.
- Favorites.
- Food Store.
- My Applications.
- Account menu.

Only show the links appropriate to the user's role and the features implemented.

The adopter navigation should feel warm and welcoming. The admin interface should have its own sidebar navigation.

### Status Badges

Use consistent labels, backgrounds, and text colours.

- **Available:** Green.
- **Pending:** Amber.
- **Approved:** Green.
- **Rejected:** Red.
- **Pending Pickup:** Soft amber or another clearly distinguishable status colour.
- **Adopted:** Neutral or muted green.
- **Not Selected:** Neutral grey (another applicant was chosen for that animal).
- **Cancelled:** Neutral grey, visibly different from Not Selected, for example with a strikethrough or a different icon (the application was withdrawn or the pickup fell through).

Do not use colour alone to communicate a status.

Distinguish between an adoption application's status and an animal's availability status. They represent different things in the PRD.

---

## 7. Motion and Interaction

### Allowed
- Subtle hover lift on animal and product cards.
- Smooth in-place animal card expansion.
- Paw or heart micro-animations on relevant actions.
- Gentle button hover transitions.
- Smooth navigation and panel transitions.
- Subtle image zoom on hover.
- Animated dropdowns and filter panels.
- Short loading indicators and clear success feedback.
- A distinctive animal-themed animation on the initial login screen.

### Special Requirement: First Login Screen Animation

**This is the only page that should have a prominent, custom-designed decorative animation.**

**Build order:** in Phase 1, build the two role panels with a simple static placeholder illustration. Add the animated scene during Phase 8 (polish). If a hand-drawn SVG scene looks amateur, fall back to a free-licensed illustration or animation pack.

The animation should communicate both parts of Furry Tales: pet adoption and the food store.

Preferred concept:
- A friendly illustrated dog and cat moving naturally within a small, charming environment.
- The scene subtly combines an adoption-centre atmosphere with a pet-food shop.
- The dog might wag its tail, the cat might stretch or blink, and small decorative elements might move gently.
- A food bowl, pet-food packets, or shop shelves can establish the food-store identity.
- Subtle paw prints or floating hearts can communicate care and adoption.
- The animation should complement the two interactive panels: "I'm looking to adopt" and "I manage a center".

The animation must be visually attractive but must not distract from choosing a role or signing in.

Use a custom illustrated scene with lightweight animation where practical. CSS, SVG, or a lightweight animation library can be used depending on the implementation.

The animation must be responsive, performant, and compatible with reduced-motion preferences.

### Never
- Excessive bouncing or flashing.
- Long animations that delay interaction.
- Animation on every element.
- Distracting parallax effects.
- Animations that block form submission or navigation.
- Large decorative animations repeated throughout the site.

**Important distinction:** The initial login page gets the prominent animal-themed animation. Other pages may use short, functional transitions, hover effects, and micro-interactions, but should not contain similarly prominent decorative animations.

---

## 8. Page-by-Page Notes

| Page | What you imagine |
|---|---|
| Sign-in / sign-up | Two interactive panels: "I'm looking to adopt" on the left and "I manage a center" on the right. A distinctive animated animal-and-pet-store scene establishes the platform's identity. Hovering gently enlarges a panel; clicking it transitions smoothly into the appropriate sign-in/sign-up form. |
| Home | A warm, welcoming landing page with a strong headline, a clear route to discover animals, category cards for Dogs, Cats, and Other, and a link to the Food Store. There is no testimonial section in v1 (it is added later, only with real words from real adopters). Use real animal photographs and clear calls to action. |
| Category / animal list | A discovery-focused layout with animal cards, distance sorting, and filters for age range, size, gender, and good with kids. Keep photographs prominent and browsing intuitive. |
| Expanded animal card | The selected card expands in place, showing additional photographs, characteristics, temperament, and the animal's story. Include View Other Animals, Add to Favorites, and Fill Adoption Form actions. |
| Adoption form | A friendly, structured form divided into logical sections: Applicant Details, Home and Lifestyle, Household, Animal Experience, Motivation and Care, and Consent. Include a progress indicator, validation, and clear submission feedback. |
| My Applications | A clean list of submitted applications, each showing the animal, submission date, application status, and relevant next steps. Pending, Approved, Rejected, and Not Selected statuses should be easy to understand. |
| Favorites | A visual collection of saved animals using the same cards as the discovery page. Include easy removal from favorites and a welcoming empty state. |
| Food store | A clean ecommerce layout with a product grid, categories, search, product photographs, prices, and stock information. Visually distinct from adoption pages while retaining the Furry Tales brand identity. |
| Cart / checkout | A practical shopping interface with product images, quantity controls, item removal, price breakdown, and clear checkout actions. Explain pay-on-delivery or pickup options. No payment gateway is required in v1. |
| Center admin dashboard | A structured dashboard with a sidebar for Animals, Applications, and Center Profile. Include tables, filters, clear status indicators, and a first-time checklist: Complete Profile → Add Your First Animal. |
| Owner approval panel | A professional review interface listing pending centers with submitted details and verification documents. Provide Approve, Reject with Reason, and Suspend actions where appropriate. |
| Pending approval screen | A calm, reassuring screen explaining that the center registration is awaiting review. Show the current status, relevant submission details, and what happens next. The center admin must not be able to list animals before approval. |

### Page-specific design rules

**Home page**
- Use different compositions across sections rather than repeating the same card layout.
- Keep animal discovery as the main focus.
- Present the food store as a secondary but clearly accessible destination.

**Food store**
- Use a more compact, functional layout than the adoption pages.
- Prioritise product details, prices, stock availability, and cart actions.
- Avoid the large emotional illustrations used on the login screen.

**Center Admin dashboard**
- Use a persistent desktop sidebar, with collapsible navigation on mobile.
- Make adding animals and reviewing applications straightforward.
- Show only the data and actions the logged-in center is authorised to access.

**Platform Owner**
- Use a distinct owner-management interface for center approvals and store management.
- Keep consequential actions clear and require confirmation where appropriate.

---

## 9. Images and Icons

### Photo style
- Use real photographs of dogs, cats, and other animals.
- Prefer natural lighting and warm, authentic imagery.
- Keep animal photography prominent on adoption pages.
- Use consistent aspect ratios for animal cards.
- Use clean product photographs in the Food Store.
- Photos for the home-page hero and the Dogs/Cats/Other category cards are free-licensed stock photos bundled with the site (check each license). Photos of animals available for adoption come only from center uploads.

### Icons
- Use a consistent library of clean line icons, with filled icons for selected or active states.
- Heart for Favorites.
- Paw for adoption-related accents.
- Search for discovery.
- Shopping bag or cart for the store.
- Clipboard for applications.
- House or shelter icon for center management.
- Check, clock, and alert icons for status indicators.

### Illustrations and textures
- Use a distinctive illustrated animal scene on the initial login screen.
- Add subtle paw-print textures to the adoption panel.
- Use a more structured shelter or clipboard illustration on the center-management panel.
- Reserve the most expressive illustrated elements for the first login screen.
- Use small decorative accents elsewhere only when they serve a clear purpose.

The login illustration should establish the brand immediately, combining animal companionship, adoption, and pet care in a single coherent scene.

---

## 10. Responsive Behavior

### Phone layout
- Use a single-column animal grid on narrow screens.
- Collapse filters into an accessible drawer or expandable panel.
- Make expanded animal cards fit the viewport.
- Use a mobile navigation menu.
- Stack form fields vertically.
- Provide comfortable touch targets.
- Convert dashboard tables into responsive lists or horizontally scrollable regions when necessary.
- Ensure the cart and checkout remain easy to use.
- Prevent horizontal overflow.

### Initial login screen on mobile
- Stack the two role panels vertically or present them as two clear, selectable cards.
- Preserve the distinction between adopting and managing a center.
- Scale or simplify the illustrated animation to suit the smaller screen.
- Ensure the animation does not obscure the role-selection buttons.
- Maintain the transition into the selected authentication form.

### Priority device
**Mobile-first, with equal attention to desktop polish.**

The platform is a responsive web application, not a native mobile app. Desktop layouts should take advantage of larger screens, while mobile layouts should remain fully functional and visually coherent.

---

## 11. Do and Don't

### Do
- Preserve the Furry Tales identity across all roles.
- Make the adoption experience warm, emotional, and welcoming.
- Give the initial login screen a memorable, custom animal-themed animation.
- Make the animation communicate both adoption and the pet-food store.
- Keep the other pages focused, with subtle and purposeful transitions.
- Use real animal photographs.
- Make animal discovery visual and intuitive.
- Preserve the smooth in-place card expansion.
- Keep forms accessible, understandable, and easy to complete.
- Make the food store visually distinct from the adoption experience.
- Give center admins and the platform owner clear, professional dashboards.
- Maintain consistent design tokens and reusable components.
- Ensure accessible contrast, keyboard navigation, and reduced-motion support.
- Implement role-based access correctly.
- Design loading, error, empty, and success states intentionally.

### Don't
- Make the whole platform look like a generic pet-shop template.
- Use excessive gradients, neon colours, or glassmorphism.
- Make the design childish through cartoon fonts or excessive illustrations.
- Put a large decorative animation on every page.
- Let the login animation distract users from role selection.
- Hide important controls behind hover-only interactions.
- Confuse application approval with animal availability.
- Allow unapproved centers to list animals.
- Give center admins access to another center's data.
- Introduce features outside the v1 PRD without approval.
- Add a payment gateway in v1.
- Add demo animals or centers; the PRD specifies that records must be created through the application.

---

## Final Design Vision

Furry Tales should feel like a modern, trustworthy platform where every animal has a story and every adoption begins a new one.

The first login screen establishes that identity through a distinctive animated scene combining animal companionship, adoption, and pet care.

After login, the experience becomes task-focused:
- **Adopters** discover animals, save favorites, apply, and track their applications.
- **Center Admins** manage animal listings and adoption applications through an organised dashboard.
- **The Platform Owner** manages center approvals and the food store through a professional administrative interface.

The adoption experience is warm and expressive. The store is clean and practical. The administration experience is structured and efficient.

All three share one consistent identity: **Furry Tales — where every animal has a story, and every adoption begins a new one.**