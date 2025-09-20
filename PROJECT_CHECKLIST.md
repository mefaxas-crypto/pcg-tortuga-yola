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

*   **1.3 Managing Allergens:** A simple but necessary list for ingredients.
    *   [x] Create a dedicated "Allergens" data model and management UI (likely in "Settings").
    *   [x] Update the "Add New Ingredient" form to use the new allergens data model (e.g., a multi-select dropdown).

## PHASE 2: LINKING DATA & CREATING VALUE

*   **2.1 Recipe & Menu Costing:**
    *   [ ] Create a "Recipes" data model.
    *   [ ] Implement UI to create recipes by combining multiple inventory items (ingredients).
    *   [ ] Automatically calculate the cost of a recipe based on the cost of its ingredients.
    *   [ ] Implement UI to create "Menus" by combining recipes.
    *   [ ] Analyze menu profitability.

*   **2.2 Inventory Depletion & Sales Tracking:**
    *   [ ] Implement a "Sales" page to log which menu items are sold.
    *   [ ] When a menu item is sold, automatically deduct the corresponding ingredient quantities from the inventory.
    *   [ ] Make the "Low Stock" notification on the dashboard dynamic and meaningful.

*   **2.3 Purchasing & Receiving:**
    *   [ ] Implement a "Purchasing" page to create purchase orders for suppliers.
    *   [ ] Automatically suggest items to reorder based on "Low Stock" levels.
    *   [ ] Implement a "Receiving" flow to update inventory quantities when a purchase order arrives.
