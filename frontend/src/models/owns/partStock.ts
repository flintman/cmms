import { LocationMiniDTO } from './location';

export interface PartStock {
  id: number;
  partId: number;
  location: LocationMiniDTO;
  quantity: number;
  minQuantity: number;
}

export interface PartStockPatchDTO {
  partId: number;
  locationId: number;
  quantity: number;
  minQuantity: number;
}

export interface PartStockTransferDTO {
  fromType: 'shop' | 'stock';
  fromId: number;
  toType: 'shop' | 'stock';
  toId: number;
  quantity: number;
}
