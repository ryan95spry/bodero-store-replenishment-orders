export type WarehouseRow = { sku: string; product: string; unitsPerCarton: number };
export type ScheduleRow = { store: string; monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string };
export type PosRow = { store: string; product: string; qty: number; start: string; end: string };

class Store {
  warehouse: WarehouseRow[] = [
    { sku: "1001", product: "Toilet Blocks", unitsPerCarton: 12 },
    { sku: "1002", product: "Pillow Set", unitsPerCarton: 8 },
  ];
  schedule: ScheduleRow[] = [
    { store: "Southland" },
    { store: "Parkmore" },
    { store: "Dandenong" },
    { store: "Broadmeadows" },
    { store: "Werribee" },
    { store: "Northland" },
    { store: "Airport West" },
  ];
  pos: PosRow[] = [];
  held: Record<string, number> = {}; // key store|product -> units
  key(store: string, product: string) { return `${store}|${product}` }
  readHeld(store: string, product: string) { return this.held[this.key(store, product)] || 0 }
  writeHeld(store: string, product: string, units: number) { this.held[this.key(store, product)] = units }
}

// Singleton
const store = (globalThis as any)._smartStore || new Store();
(globalThis as any)._smartStore = store;
export default store;
