# PCG Kitchen Manager - User Guide

Welcome to the PCG Kitchen Manager! This guide will walk you through the core features and processes of the application.

## 1. Getting Started: Login & Setup

### 1.1. Logging In

-   Upon visiting the app, you will be prompted to sign in with your Google account. Click the **"Sign in with Google"** button.
-   This application uses role-based access control. Your assigned role (e.g., Admin, Manager, Chef) will determine which features you can see and use.

### 1.2. Selecting an Outlet

-   After logging in, the first step is to **select a kitchen outlet** from the dropdown menu in the top-left of the header.
-   All data you see on the Dashboard, Inventory, and Purchasing pages is scoped to the selected outlet. You can switch between outlets at any time.

### 1.3. Initial Data Setup (For Admins)

Before you can effectively use the system, an Admin user should set up the foundational data in the **Settings** section:

1.  **Outlets**: Go to `Settings -> Outlet Management` to add all your physical kitchen locations (e.g., "Main Kitchen," "Pool Bar").
2.  **Categories**: Go to `Settings -> Category Management` to define your inventory categories (e.g., "Meat," "Produce," "Dry Goods").
3.  **Allergens**: Go to `Settings -> Allergen Management` to create a list of all allergens you need to track.
4.  **Suppliers**: Go to the **Suppliers** page from the main menu to add all your vendors.

## 2. Core Workflow: Inventory to Sales

This is the primary day-to-day workflow of the application.

### 2.1. Managing Inventory

1.  **Navigate** to the **Inventory** page.
2.  **Add Ingredients**: Click **"Add New Ingredient"**.
    -   Fill out the details, including SAP Code, Name, Category, and Purchase Info (how you buy it, e.g., 1 case for $50).
    -   Set the **Min/Max Stock** levels. These are critical for generating reorder suggestions.
    -   Assign a **Vendor** and any known **Allergens**.
3.  **View Stock**: The "Inventory List" tab shows the master list of all ingredients. The "On Hand" quantity is specific to your currently selected outlet.
4.  **Physical Counts**:
    -   Go to the "Physical Count" tab.
    -   Enter the actual counted quantity for each item in the "Physical Count" column. You can change the unit for easier counting (e.g., count bottles instead of liters).
    -   The "Variance" column will show the difference between the system's theoretical count and your physical count.
    -   Click **"Save Counts"** to update your inventory and log the variance for reporting.
5.  **Inventory Transfers**:
    -   Go to the "Transfers" tab.
    -   Use the "New Inventory Transfer" form to move stock from one outlet to another.
    -   The "Transfer History" table shows a log of all past movements.

### 2.2. Creating Recipes & Menus

1.  **Navigate** to the **Recipes & Production** page.
2.  **Create a Recipe**: Click **"Add New Recipe"**.
    -   Fill in the recipe details (Name, Category, Yield).
    -   Use the search bar in the "Ingredients" table to find and add ingredients from your inventory.
    -   As you add ingredients and specify quantities, the **Total Cost** of the recipe is calculated automatically.
    -   The **Financials** card shows the cost per portion and a suggested selling price based on your target food cost percentage.
3.  **Create a Menu**:
    -   Navigate to the **Menus** page and click **"Add New Menu"**.
    -   Give the menu a name (e.g., "Dinner Menu").
    -   Add recipes to the menu and set the final **Selling Price** for each.

### 2.3. Logging Sales

1.  **Navigate** to the **Sales** page.
2.  In the "Log a New Sale" card, select the **Menu** and the **Menu Item** that was sold.
3.  Enter the **Quantity Sold** and click **"Log Sale"**.
4.  **Result**: This action immediately depletes the corresponding ingredients from your selected outlet's inventory and records the transaction for financial reporting.

## 3. Purchasing & Receiving

### 3.1. Creating a Purchase Order (PO)

1.  **Navigate** to the **Purchasing** page.
2.  On the "Create New PO" tab, select a **Supplier**.
3.  The table will automatically populate with all items from that supplier. It will also suggest an **Order Quantity** for any items that are below their "Min Stock" level.
4.  Adjust quantities as needed and click **"Create Purchase Order"**.

### 3.2. Receiving a Purchase Order

1.  On the **Purchasing** page, go to the "Existing POs" tab.
2.  Find the "Pending" PO you wish to receive in the "Active" list.
3.  Click the vertical dots (`...`) and select **"Receive"**.
4.  In the dialog, confirm the **Received Qty** and **Unit Price** for each item. Adjust if there are discrepancies (e.g., short-shipped, price change).
5.  Optionally, add notes or attach a scanned invoice.
6.  Click **"Confirm & Update Inventory"**. The items will be added to your stock. If you entered a new price, the item's cost will be updated using a weighted-average calculation.

## 4. Production & Butchering

### 4.1. Logging Sub-Recipe Production

This is for making batches of items that are ingredients in other recipes (e.g., "Tomato Sauce").

1.  First, create the recipe for the "Tomato Sauce" and make sure to toggle on **"Is Sub-Recipe?"**.
2.  Navigate to **Recipes & Production** -> **Sub-recipe Production**.
3.  Use the **"Add Sub-Recipe to Log"** button to select "Tomato Sauce".
4.  Enter the number of **Batches Produced** and click **"Log All Production"**.
5.  **Result**: The raw ingredients (tomatoes, herbs, etc.) will be depleted from inventory, and the stock of "Tomato Sauce" (as an inventory item) will be increased.

### 4.2. Logging Butchering Yield

This is for breaking down a large item (like a whole fish) into usable cuts.

1.  First, ensure you have inventory items for both the primary cut (e.g., "Whole Salmon") and the yielded cuts (e.g., "Salmon Fillet," "Salmon Trim").
2.  (Optional but Recommended) Go to **Settings -> Butchering Templates** to define the expected yields from a primary cut.
3.  Navigate to **Recipes & Production** -> **Butchering Log**.
4.  Select the **Primary Item** ("Whole Salmon") and the **Quantity Used**.
5.  If a template exists, the yielded items will appear. Enter the actual **Weight / Qty** for each yielded cut.
6.  Click **"Log Butchering"**.
7.  **Result**: The stock of "Whole Salmon" will be depleted, and the stock for "Salmon Fillet" and "Salmon Trim" will be increased, with the cost of the primary item intelligently distributed across the yields.

## 5. Reports & AI Tools

### 5.1. Reports

-   **Navigate** to the **Reports** page.
-   **Sales & Profitability**: Select a date range to view your key financial metrics. This report includes KPI cards, a performance-over-time chart, and a detailed Profit & Loss breakdown by menu item.
-   **Variance Analysis**: Select a date range to analyze the difference between your theoretical food cost (what you sold) and your actual food cost (after physical counts). This helps pinpoint waste, loss, or portioning issues.

### 5.2. AI Tools

-   **Navigate** to the **AI Tools** page.
-   **Waste Prediction**: Provide historical data and current inventory to get an AI-powered analysis of potential future waste and suggestions for prevention.
-   **Recipe Suggestions**: The AI will analyze your current inventory and suggest recipes you can make to use up ingredients, minimizing spoilage.
