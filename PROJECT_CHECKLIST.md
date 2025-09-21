# Revised Feature Checklist (Grounded Approach)

This file tracks our development progress to ensure we build the app logically, where each new feature rests on a solid foundation.

## PHASE 1: CORE DATA MODELS (THE FOUNDATION)

*   **1.1 Managing Suppliers:** We need to know who we're buying from.
    *   [x] Create "Suppliers" page.
    *   [x] Display a basic table.
    *   [x] Implement the "Add New Supplier" form (Name, Contact, Phone, Email) and save the data.
    *   [x] Implement Edit & Delete functionality for suppliers.

*   **1.2 Managing Raw Ingredients:** This is the heart of the system.
    *   [x] "Inventory" page exists.
    *   [x] Overhaul the "Add New Ingredient" functionality to include all the detailed fields (SKU, units, costs, par level, etc.).
    *   [x] Implement Edit & Delete functionality for ingredients.
    *   **Note on Par Levels:** Currently, the `parLevel` is measured in the recipe/presentation `unit` (e.g., individual eggs), not the `purchaseUnit` (e.g., cases). A future enhancement could add a conversion factor to allow setting par levels by the purchase unit.

*   **1.3 Managing Allergens:** A simple but necessary list for ingredients.
    *   [x] Create a dedicated "Allergens" data model and management UI (likely in "Settings").
    *   [x] Update the "Add New Ingredient" form to use the new allergens data model (e.g., a multi-select dropdown).

## PHASE 2: LINKING DATA & CREATING VALUE

*   **2.1 Recipe & Menu Costing:**
    *   [x] Create a "Recipes" data model.
    *   [x] Implement UI to create recipes by combining multiple inventory items (ingredients).
    *   [x] Automatically calculate the cost of a recipe based on the cost of its ingredients.
    *   [x] Implement UI to create "Menus" by combining recipes.
    *   [x] Make the "Menu" dropdown in the recipe form functional.
    *   [x] Analyze menu profitability.
    *   **Note on Unit Conversion**: When building the unit conversion engine, the recipe form should allow inputting various units (e.g., 'cup', 'tbsp') but always calculate the final cost based on a standard unit like grams.

*   **2.2 Inventory Depletion & Sales Tracking:**
    *   [ ] Implement a "Sales" page to log which menu items are sold.
    *   [ ] When a menu item is sold, automatically deduct the corresponding ingredient quantities from the inventory.
    *   [ ] Make the "Low Stock" notification on the dashboard dynamic and meaningful.

*   **2.3 Purchasing & Receiving:**
    *   [ ] Implement a "Purchasing" page to create purchase orders for suppliers.
    *   [ ] Automatically suggest items to reorder based on "Low Stock" levels.
    *   [ ] Implement a "Receiving" flow to update inventory quantities when a purchase order arrives.

    
