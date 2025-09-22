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
    *   [x] Implement Physical Stock Takes & Variance Reporting.
    *   **Note on Par Levels:** Currently, the `parLevel` is measured in the recipe/presentation `unit` (e.g., individual eggs), not the `purchaseUnit` (e.g., cases). A future enhancement could add a conversion factor to allow setting par levels by the purchase unit.

*   **1.3 Managing Foundational Data:** Simple but necessary lists for ingredients and recipes.
    *   [x] Create a dedicated "Allergens" data model and management UI (in "Settings").
    *   [x] Create a dedicated "Ingredient Categories" data model and management UI (in "Settings").
    *   [x] Update the "Add New Ingredient" form to use these new data models (e.g., a multi-select dropdown).

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
    *   [x] Implement a "Sales" page to log which menu items are sold.
    *   [x] When a menu item is sold, automatically deduct the corresponding ingredient quantities from the inventory.
    *   [x] Make the "Low Stock" notification on the dashboard dynamic and meaningful.

*   **2.3 Purchasing & Receiving (The Closed Loop):**
    *   [x] Implement a "Purchasing" page to create purchase orders for suppliers.
    *   [x] Automatically suggest items to reorder based on "Low Stock" levels.
    *   [ ] Implement a "Receiving" flow to update inventory quantities when a purchase order arrives.
    *   [ ] Update PO status (e.g., Pending, Partially Received, Received).

*   **2.4 Multi-Outlet & Central Kitchen Support:**
    *   [ ] Create "Outlets" data model and management UI (e.g., "Hotel", "Restaurant").
    *   [ ] **Strategy:** Refactor inventory to separate shared "Item Specifications" (in `/inventory`) from outlet-specific "Stock Levels" (in a new `/inventoryStock` collection).
    *   [ ] Scope all data (sales, inventory views, purchasing) to a specific outlet, likely via a global state/context.
    *   [ ] Implement inventory transfers between outlets.

## PHASE 3: PROFESSIONAL & ENTERPRISE FEATURES

*   **3.1 Advanced Reporting & Analytics:**
    *   [ ] Build UI for "Reports" page to display meaningful data.
    *   [ ] Implement Actual vs. Theoretical Food Cost reporting.
    *   [ ] Implement historical variance analysis to identify trends.
    *   [ ] Add Profit & Loss reporting by menu item and category.

*   **3.2 User Roles & Permissions:**
    *   [ ] Implement a user authentication system.
    *   [ ] Define roles (Admin, Chef, Purchasing Manager).
    *   [ ] Restrict access to pages and actions based on user role.

## PHASE 4: WORLD-CLASS AI INTEGRATION

*   **4.1 AI-Powered Purchasing Agent:**
    *   [ ] Implement demand forecasting based on sales history, seasonality, and events.
    *   [ ] Generate optimized purchase orders to minimize waste and stockouts.
    *   [ ] Track and analyze supplier price fluctuations over time to recommend cost-effective choices.

*   **4.2 Dynamic Menu Engineering:**
    *   [ ] Implement AI-driven suggestions for menu pricing and item placement to maximize profitability.
    *   [ ] Generate compelling, professional menu descriptions for new or existing items.
    *   [ ] Create entire themed menus based on high-level concepts and inventory analysis.

*   **4.3 Advanced Operational Intelligence:**
    *   [ ] Automatically generate daily prep lists for kitchen staff based on sales forecasts.
    *   [ ] Implement intelligent variance analysis to detect patterns of waste, spoilage, or theft.
    *   [x] **(Existing)** Implement "Waste Prediction" tool.
    *   [x] **(Existing)** Implement "Intelligent Recipe Suggestions" tool.

