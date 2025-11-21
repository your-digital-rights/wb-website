# Step 11 – Products & Services Update Specification

**Task**  
Update Step 11 of the onboarding flow, in the `Products & Services` section, to support richer product entries. In the following description, “product” always means “product or service.”

## Current behavior

There is a `Your Products/Services` subsection where the user can add multiple products, each with a simple text description. Products are optional and the user can add up to 6 items. Products can already be reordered, edited, and deleted.

## New behavior

Replace the current simple text entry for each product with a richer product form.

For each product, the user should be able to enter:

1. **Product name**  
   - Required  
   - Minimum 3 characters  

2. **Product description**  
   - Required  
   - Minimum 10 characters  
   - Maximum 100 characters  

3. **Product photos**  
   - Optional  
   - Up to 5 photos per product  
   - Maximum 10 MB per photo  
   - Upload photos to Supabase Storage  
   - Show an upload progress indicator for each file  

4. **Product price in euros**  
   - Optional  
   - Numeric  
   - Euros only  
   - Allow decimals  

Overall constraints:

- Adding any products remains optional.  
- The user can add **0 to 6 products total** for this step.  
- The user can still reorder products, edit them, and delete them.

## Photo handling and Supabase

- Reuse the existing Supabase client and configuration in the project.  
- Reuse upload implementation from step 12.
- Use a dedicated bucket for product images if it exists, or introduce a new bucket (`product-images`).  
- Enforce file number and size limits.  
- Show an upload indicator per file.  
- Prevent navigation away from Step 11 while uploads are in progress.  
- Handle upload errors gracefully and allow retry.  
- Show thumbnails for uploaded photos.  
- Allow reordering of photos after upload.  
- Store stable Supabase references (public URLs or paths).

## Product list display

The list view for this step must show:

- A thumbnail (first photo if available, else placeholder)  
- Product name  
- Product price  

The user must be able to reorder, edit, and delete products.

## Validation and UX rules

- Use existing design system styling.
- Enforce name and description character limits.  
- Name and description required.  
- Products optional as long as no uploads are active.  

## Internationalization

All user facing text must be in **English and Italian**, including:

- Labels  
- Placeholders  
- Buttons  
- Validation and error messages  
- Helper text  

Integrate with the existing i18n setup.

## State persistance 
- Product information is saved as part of the form state to local storage and supabase allowing the user to resume onboarding later.

## Testing

### Manual testing
Use **Playwright MCP** and **next devtools MCP** to manually inspect and confirm:

- State handling  
- Storage paths  
- Locale switching  

### Unit tests
Update and add tests for:

- Field validation  
- Optional fields  
- Product count limit  
- Photo limits  
- Reordering of products and photos  

### End to end test
Create a new Playwright E2E test covering:

- Adding products with photos  
- Upload indicators  
- Navigation lock while uploading  
- Correct rendering in the list  
- Reordering, editing, and deleting  


### Final checks

- All tests pass  
- Build passes  
- No type or lint errors  
- Dev server start with no errors
- CI passes with no erros

## Definition of done

- Step 11 implements the new rich product form  
- Data persists correctly  
- UX responsive and consistent  
- All text localized  
- All tests pass
- Deployment to Vercel passes with no errors
