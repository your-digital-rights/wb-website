# Feature Specification: Enhanced Products & Services Entry

**Feature Branch**: `002-improved-products-service`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "improved products service : implement the feature specified in @docs/step-11-products-and-services-v2-pre-spec.md"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Update Step 11 onboarding to support rich product entries
2. Extract key concepts from description
   → Actors: Users completing onboarding
   → Actions: Add, edit, delete, reorder products with detailed information
   → Data: Product name, description, photos, price
   → Constraints: 0-6 products, photo limits, character limits, validation rules
3. For each unclear aspect:
   → See [NEEDS CLARIFICATION] markers in requirements
4. Fill User Scenarios & Testing section
   → User flow: Navigate to Step 11 → Add products → Upload photos → Save and continue
5. Generate Functional Requirements
   → All requirements derived from pre-spec document
6. Identify Key Entities
   → Product entity with name, description, photos, price
7. Run Review Checklist
   → WARN: Minor clarifications needed on post-submission editing
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Explicit Scope Boundaries
**In Scope:**
- Product data entry during Step 11 of onboarding
- Product information persistence (localStorage and database)
- Product management (add, edit, delete, reorder) within Step 11
- Photo upload and management during onboarding

**Out of Scope:**
- Post-onboarding product visibility or publication
- Public/private product status management
- Product display on user profiles or public pages
- Product approval or review workflows
- Any product-related features after completing onboarding

---

## Clarifications

### Session 2025-11-20
- Q: Which image file types should be accepted for product photo uploads? → A: JPEG, PNG, WebP only (modern web-optimized formats)
- Q: After completing onboarding, what happens to the entered product information? → A: Out of scope - post-onboarding product visibility/publication is not part of this feature
- Q: What are the MAXIMUM character limits for product fields? → A: Maximum 50 characters for name, 100 characters for description
- Q: When should product information be saved during editing? → A: Auto-save with debounce (same as existing onboarding: 1.5s debounce, 3s max wait)
- Q: How should the system handle large images before upload? → A: Same as existing onboarding - use Next.js Image with Vercel integration for automatic optimization

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a user completing the onboarding process, I want to add detailed information about my products and services in Step 11, including names, descriptions, photos, and prices, so that potential customers can understand what I offer. I should be able to add multiple products, manage their photos, and organize them in the order I prefer. The system should help me by validating my input, showing upload progress, and persisting my data so I can resume later if needed.

### Acceptance Scenarios

1. **Given** I am on Step 11 of onboarding with no products added, **When** I choose to skip adding products and navigate to the next step, **Then** the system allows me to proceed without any products

2. **Given** I am on Step 11, **When** I click "Add Product" and enter a product name (3-50 characters) and description (10-100 characters), **Then** the product is added to my list

3. **Given** I have added a product, **When** I upload up to 5 photos (each under 10 MB), **Then** the system shows upload progress for each photo, displays thumbnails after upload, and prevents me from navigating away during upload

4. **Given** I have added a product with photos, **When** I enter a price in euros (with optional decimals), **Then** the price is saved and displayed with the product

5. **Given** I have multiple products in my list, **When** I drag to reorder them, **Then** the products appear in my chosen order in the list view

6. **Given** I have a product in my list, **When** I click edit, **Then** I can modify the name, description, photos, or price and save the changes

7. **Given** I have a product in my list, **When** I click delete, **Then** the product and its associated photos are removed from my list

8. **Given** I have uploaded photos for a product, **When** I reorder the photos, **Then** the first photo becomes the thumbnail displayed in the list view

9. **Given** I am entering product information, **When** I switch languages between English and Italian, **Then** all labels, placeholders, buttons, validation messages, and helper text appear in the selected language

10. **Given** I have started adding products, **When** I leave and return to Step 11 later, **Then** all my previously entered product information is preserved

11. **Given** I have 6 products added, **When** I attempt to add a 7th product, **Then** the system prevents me from adding more products

12. **Given** I am uploading a product photo, **When** the upload fails, **Then** the system shows an error message and allows me to retry the upload

### Edge Cases

- **Boundary: Maximum products**: What happens when a user tries to add more than 6 products? System must prevent addition and show a clear message
- **Boundary: Photo limits**: What happens when a user tries to upload more than 5 photos per product? System must prevent upload and show a clear message
- **Boundary: File size**: What happens when a user tries to upload a file larger than 10 MB? System must reject the file and show a clear error message
- **Validation: Unsupported file type**: What happens when a user tries to upload a file that is not JPEG, PNG, or WebP? System must reject the file and show a clear error message indicating only JPEG, PNG, and WebP formats are accepted
- **Error: Upload failure**: How does the system handle failed photo uploads? Must show error, preserve other data, and allow retry
- **Error: Network interruption**: What happens if the user loses connection during upload? System must handle gracefully and allow retry
- **Navigation: Uploads in progress**: What happens if the user tries to leave Step 11 while photos are uploading? System must prevent navigation and show a warning
- **Validation: Character limits**: What happens when a user enters a name outside 3-50 characters or a description outside 10-100 characters? System must show real-time validation feedback
- **Data persistence**: What happens if the user closes the browser mid-entry? All entered data must be preserved and restored on return
- **Empty state**: What happens when a user has no products and returns to Step 11? System must allow them to add products or proceed without any

## Requirements *(mandatory)*

### Functional Requirements

#### Product Management
- **FR-001**: System MUST allow users to add between 0 and 6 products in Step 11 of the onboarding flow
- **FR-002**: System MUST allow users to proceed from Step 11 without adding any products
- **FR-003**: System MUST prevent users from adding more than 6 products total
- **FR-004**: Users MUST be able to reorder products in their list
- **FR-005**: Users MUST be able to edit any product they have added
- **FR-006**: Users MUST be able to delete any product they have added

#### Product Information Fields
- **FR-007**: System MUST require a product name with a minimum of 3 characters and maximum of 50 characters
- **FR-008**: System MUST require a product description with a minimum of 10 characters and maximum of 100 characters
- **FR-009**: System MUST enforce character limits for name and description fields in real-time
- **FR-010**: System MUST allow users to optionally add a price in euros with decimal values
- **FR-011**: System MUST validate that price values are positive numbers with maximum 2 decimal places when provided (e.g., 49.99, 1500.00)

#### Photo Management
- **FR-012**: System MUST allow users to optionally upload up to 5 photos per product
- **FR-013**: System MUST accept only JPEG, PNG, and WebP image formats for photo uploads
- **FR-014**: System MUST enforce a maximum file size of 10 MB per photo
- **FR-015**: System MUST use Next.js Image component with Vercel integration for automatic image optimization consistent with existing onboarding steps
- **FR-016**: System MUST show an upload progress indicator for each product photo being uploaded, with progress updates every 500ms to balance responsiveness and performance
- **FR-017**: System MUST display thumbnails for all uploaded product photos
- **FR-018**: System MUST allow users to reorder product photos within a product
- **FR-019**: System MUST use the first product photo as the thumbnail in the product list view
- **FR-020**: System MUST show a placeholder thumbnail when no product photos are uploaded
- **FR-021**: System MUST reject uploads of unsupported file types and display a clear error message
- **FR-022**: System MUST handle product photo upload errors gracefully with exponential backoff retry (consistent with existing FileUploadWithProgress component) and allow users to manually retry failed uploads
- **FR-023**: System MUST prevent users from navigating away from Step 11 while product photo uploads are in progress by tracking upload status and conditionally disabling Next/Previous navigation buttons

#### Product List Display
- **FR-024**: System MUST display each product in the list with a thumbnail (first product photo as 200x200px square or placeholder), product name, and product price
- **FR-025**: System MUST show products in the order specified by the user, with consistent display order maintained across all views
- **FR-026**: System MUST provide clear visual indicators for reordering, editing, and deleting products

#### Validation & Error Handling
- **FR-027**: System MUST provide real-time validation feedback for all required fields, with error messages that include the specific field name, violated constraint (e.g., "minimum 3 characters"), and corrective action
- **FR-028**: System MUST display error messages when validation fails, formatted as "[Field Name] [constraint violation]. [Corrective action]" (e.g., "Product name must be at least 3 characters. Please enter a longer name.")
- **FR-029**: System MUST prevent form submission when required fields are incomplete
- **FR-030**: System MUST prevent photo uploads that exceed size or count limits
- **FR-031**: System MUST display error messages for failed product photo uploads showing specific failure reason (e.g., "File size exceeds 10 MB. Please select a smaller image.") with visible retry button

#### Data Persistence
- **FR-032**: System MUST auto-save all product information with debounced persistence (1.5 second debounce, 3 second max wait), with exponential backoff retry on network failures (consistent with existing onboarding auto-save pattern)
- **FR-033**: System MUST persist all product information to local storage immediately via Zustand persist middleware
- **FR-034**: System MUST persist all product information to the backend database via auto-save
- **FR-035**: System MUST show auto-save status indicators ('saving', 'saved') consistent with other onboarding steps
- **FR-036**: System MUST restore previously entered product information when users return to Step 11
- **FR-037**: System MUST preserve product data if users close the browser and return later

#### Internationalization
- **FR-038**: System MUST display all labels, placeholders, buttons, validation messages, and helper text in English and Italian
- **FR-039**: System MUST respect the user's language selection throughout Step 11
- **FR-040**: System MUST switch all text content when users change language settings

#### Design & Accessibility
- **FR-041**: System MUST use existing design system styling consistently throughout Step 11
- **FR-042**: System MUST maintain responsive design for mobile and desktop layouts
- **FR-043**: System MUST follow accessibility standards for keyboard navigation and screen readers

#### Testing Requirements
- **FR-044**: System MUST pass all unit tests for field validation, optional fields, product count limits, product photo limits, and reordering functionality
- **FR-045**: System MUST pass end-to-end tests covering: adding products with product photos, upload indicators, navigation lock during uploads, list rendering, reordering, editing, and deleting
- **FR-046**: System MUST build without errors and pass all linting checks
- **FR-047**: System MUST start the development server without errors
- **FR-048**: System MUST pass CI/CD pipeline without errors

#### Performance Requirements (per Constitution IV)
- **FR-049**: System MUST achieve Largest Contentful Paint (LCP) ≤ 1.8 seconds and Cumulative Layout Shift (CLS) < 0.1 on mobile devices for Step 11, validated via Playwright performance tests with web-vitals library

### Key Entities

- **Product**: Represents a product or service offered by the user
  - Name: Text identifier (3-50 characters, required)
  - Description: Detailed text description (10-100 characters, required)
  - Photos: Collection of up to 5 images (optional)
  - Price: Numeric value in euros with optional decimals (optional)
  - Display order: User-defined position in the product list
  - Associated user: Link to the user completing onboarding

- **Product Photo**: Represents an uploaded image for a product
  - Image file: Binary data in JPEG, PNG, or WebP format (maximum 10 MB per file)
  - Display order: Position within the product's photo collection
  - Upload status: Progress indicator during upload
  - Storage reference: Stable reference to stored image
  - Associated product: Link to the parent product

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none remain)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Definition of Done

The feature is considered complete when:

1. Step 11 of the onboarding flow implements the rich product entry form with all required fields
2. Users can add 0-6 products with name, description, photos, and price
3. Photo upload functionality works with progress indicators and error handling
4. Navigation is locked during active uploads
5. Product list displays thumbnails, names, and prices
6. Users can reorder, edit, and delete products
7. All validation rules are enforced (character limits, file sizes, counts)
8. All user-facing text is available in English and Italian
9. Product data persists to local storage and backend database
10. Users can resume onboarding with preserved product data
11. All unit tests pass
12. All end-to-end tests pass
13. Production build completes without errors
14. No linting or type errors
15. Development server starts without errors
16. CI/CD pipeline passes
17. Deployment to Vercel succeeds without errors
