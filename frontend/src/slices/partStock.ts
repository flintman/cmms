import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import { PartStock, PartStockPatchDTO, PartStockTransferDTO } from '../models/owns/partStock';
import api from '../utils/api';
import { revertAll } from 'src/utils/redux';

const basePath = 'part-stocks';

interface PartStockState {
  stocksByPart: Record<number, PartStock[]>;
  loadingGet: boolean;
}

const initialState: PartStockState = {
  stocksByPart: {},
  loadingGet: false
};

const slice = createSlice({
  name: 'partStocks',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getStocksByPart(
      state: PartStockState,
      action: PayloadAction<{ partId: number; stocks: PartStock[] }>
    ) {
      const { partId, stocks } = action.payload;
      state.stocksByPart[partId] = stocks;
    },
    addStock(
      state: PartStockState,
      action: PayloadAction<{ stock: PartStock }>
    ) {
      const { stock } = action.payload;
      const existing = state.stocksByPart[stock.partId] ?? [];
      state.stocksByPart[stock.partId] = [...existing, stock];
    },
    editStock(
      state: PartStockState,
      action: PayloadAction<{ stock: PartStock }>
    ) {
      const { stock } = action.payload;
      const list = state.stocksByPart[stock.partId] ?? [];
      state.stocksByPart[stock.partId] = list.map((s) =>
        s.id === stock.id ? stock : s
      );
    },
    deleteStock(
      state: PartStockState,
      action: PayloadAction<{ id: number; partId: number }>
    ) {
      const { id, partId } = action.payload;
      const list = state.stocksByPart[partId] ?? [];
      state.stocksByPart[partId] = list.filter((s) => s.id !== id);
    }
  }
});

export const reducer = slice.reducer;

export const getPartStocks =
  (partId: number): AppThunk =>
  async (dispatch) => {
    const stocks = await api.get<PartStock[]>(`${basePath}/part/${partId}`);
    dispatch(slice.actions.getStocksByPart({ partId, stocks }));
  };

export const createPartStock =
  (dto: PartStockPatchDTO): AppThunk =>
  async (dispatch) => {
    const stock = await api.post<PartStock>(basePath, dto);
    dispatch(slice.actions.addStock({ stock }));
  };

export const updatePartStock =
  (id: number, dto: PartStockPatchDTO): AppThunk =>
  async (dispatch) => {
    const stock = await api.patch<PartStock>(`${basePath}/${id}`, dto);
    dispatch(slice.actions.editStock({ stock }));
  };

export const deletePartStock =
  (id: number, partId: number): AppThunk =>
  async (dispatch) => {
    await api.deletes<{ success: boolean }>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteStock({ id, partId }));
  };

export const transferPartStock =
  (dto: PartStockTransferDTO): AppThunk =>
  async (dispatch) => {
    await api.post(`${basePath}/transfer`, dto);
    // Re-fetch the part stocks to reflect updated quantities is done by caller
  };

export default slice;
