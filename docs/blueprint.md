# **App Name**: PCG Kitchen Manager

## Core Features:

- Inventory Tracking: Monitor food items, quantities, expiration dates, par levels, and suppliers in real-time across multiple outlets.
- Recipe & Menu Engineering: Create dynamic recipes and sub-recipes with precise costing that updates automatically when ingredient prices change. Analyze the profitability of entire menus to hit target food cost percentages.
- Fabrication & Yield Management: Define specifications for butchering and fabrication (e.g., breaking down a whole tenderloin). Automatically calculate the true cost and inventory of each yielded item (e.g., center-cut filets vs. trimmings) while tracking waste.
- Sales Logging & Live Depletion: Integrate with sales data to automatically deplete the precise ingredients and sub-recipes from inventory as items are sold, providing a true, theoretical stock count at all times.
- Physical Stock Takes & Variance Reporting: A dedicated module for conducting physical inventory counts and generating variance reports to compare theoretical vs. physical stock, pinpointing sources of waste, spoilage, or loss.
- Allergen Tracking: Tag individual ingredients with allergens (e.g., gluten, nuts, dairy). This data will automatically aggregate up to recipes and menu items, allowing for instant and accurate dietary information for guests.
- Firebase & Google Cloud Integration: The system will be a cloud-native application. Database: Connect to a secure and scalable Google Cloud SQL for PostgreSQL instance. Backend: The Python/Django API will be containerized and deployed as a serverless service on Google Cloud Run. Frontend: The Vite + React user interface will be hosted globally on Firebase Hosting.
- AI-Powered Waste Prediction: Employ a Genkit-powered AI tool to analyze historical data and predict potential food waste, allowing for proactive adjustments to inventory and purchasing.
- Intelligent Recipe Suggestions: Utilize Genkit to provide AI-driven recipe suggestions based on current inventory, minimizing waste and maximizing resource utilization.

## Style Guidelines:

- Primary Color: Sage Green (`#A3C9A8`) to evoke freshness and a sense of calm control.
- Background Color: A professional dark theme using Off-Black (`#1E1E1E`) for the main background to reduce eye strain in various lighting conditions.
- Accent Color: Muted Gold (`#DAA373`) for primary buttons, active states, and important highlights.
- Headline Font: "Playfair Display", a classic serif font for main titles and dashboards to add a touch of elegance.
- Body & UI Font: "Inter", a clean and highly legible sans-serif font ideal for data tables, forms, and all interactive elements.
- A card-based and table-based hybrid layout. Use cards for dashboard summaries and POS-style views, and dense data tables for inventory and reporting modules. Implement clear iconography for actions like "edit," "delete," and "add."
- Employ subtle and smooth transitions on user interactions to provide a modern, responsive feel without being distracting.