
import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'Admin' | 'Manager' | 'Chef' | 'Clerk' | 'Cook' | 'Pending';
    outletId?: string; // For Clerk/Cook roles
}

export interface Outlet {
    id: string;
    name: string;
    address?: string;
    theme?: string;
    userId: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    userId: string;
}

export interface InventoryItem {
    id: string;
    materialCode: string;
    name: string;
    category: string;
    purchaseQuantity: number;
    purchaseUnit: string;
    purchasePrice: number;
    unitCost: number;
    supplierId?: string;
    allergens?: string[];
    minStock: number;
    maxStock: number;
    recipeUnit: string;
    recipeUnitConversion?: number;
    userId: string;
    // Deprecated, use minStock/maxStock
    parLevel?: number; 
}

export interface InventoryStockItem {
    id: string;
    inventoryId: string;
    outletId: string;
    quantity: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    userId: string;
}

export interface RecipeIngredient {
    itemId: string;
    ingredientType: 'inventory' | 'recipe';
    itemCode: string;
    name: string;
    quantity: number;
    unit: string;
    totalCost: number;
}

export interface Recipe {
    id: string;
    internalCode: string;
    sapCode?: string;
    name: string;
    isSubRecipe: boolean;
    category: string;
    menuId?: string;
    yield?: number;
    yieldUnit?: string;
    notes?: string;
    ingredients: RecipeIngredient[];
    totalCost: number;
    contingencyPercentage: number;
    foodCostPercentage: number;
    userId: string;
}

export interface MenuItem {
    recipeId: string;
    name: string;
    category: string;
    totalCost: number;
    sellingPrice: number;
}

export interface Menu {
    id: string;
    name: string;
    items: MenuItem[];
    userId: string;
}

export interface Sale {
    id: string;
    outletId: string;
    menuId: string;
    menuName: string;
    recipeId: string;
    recipeName: string;
    quantity: number;
    totalRevenue: number;
    totalCost: number;
    saleDate: Date;
    userId: string;
}

export interface ProductionLog {
    id: string;
    outletId: string;
    logDate: Date;
    producedItems: {
        recipeId: string;
        recipeName: string;
        quantityProduced: number;
        yieldPerBatch: number;
        yieldUnit: string;
    }[];
    user?: string;
}

export interface ButcheryTemplate {
    id: string;
    name: string;
    primaryItemMaterialCode: string;
    yields: {
        id: string; // Material code of the yielded item
        name: string; // Name of the yielded item
        costDistributionPercentage: number;
    }[];
    userId: string;
}

export interface PhysicalCountItem {
    id: string;
    name: string;
    physicalQuantity: number;
    theoreticalQuantity: number;
    unit: string;
}

export interface ButcheringLog {
    id: string;
    outletId: string;
    logDate: Date;
    primaryItem: {
        itemId: string;
        itemName: string;
        quantityUsed: number;
        unit: string;
    };
    yieldedItems: {
        itemName: string;
        quantityYielded: number;
        unit: string;
    }[];
    user?: string;
}


export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    outletId: string;
    createdAt: Date & Timestamp;
    status: 'Pending' | 'Partially Received' | 'Received' | 'Cancelled';
    items: {
        itemId: string;
        name: string;
        materialCode: string;
        orderQuantity: number;
        purchaseUnit: string;
        purchasePrice: number;
    }[];
    user?: string;
    userId: string;
}

export interface Allergen {
    id: string;
    name: string;
}

export interface IngredientCategory {
    id: string;
    name: string;
}

export interface InventoryTransfer {
    id: string;
    fromOutletId: string;
    fromOutletName: string;
    toOutletId: string;
    toOutletName: string;
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    transferDate: Date;
    user?: string;
}

export interface VarianceLog {
    id: string;
    outletId: string;
    logDate: Date;
    totalVarianceValue: number;
    items: {
        itemId: string;
        itemName: string;
        physicalQuantity: number;
        theoreticalQuantity: number;
        unit: string;
        variance: number;
        varianceValue: number;
    }[];
}
