import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import SwapHorizTwoToneIcon from '@mui/icons-material/SwapHorizTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import Part from '../../../models/owns/part';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { PermissionEntity } from '../../../models/owns/role';
import useAuth from '../../../hooks/useAuth';
import ImageViewer from 'react-simple-image-viewer';
import {
  getAssetUrl,
  getCustomerUrl,
  getTeamUrl,
  getUserUrl,
  getVendorUrl,
  getWorkOrderUrl
} from '../../../utils/urlPaths';
import { editPart } from '../../../slices/part';
import {
  getPartStocks,
  createPartStock,
  updatePartStock,
  deletePartStock,
  transferPartStock
} from '../../../slices/partStock';
import { getLocationsMini } from '../../../slices/location';
import { useDispatch, useSelector } from '../../../store';
import FilesList from '../components/FilesList';
import { getAssetsByPart } from '../../../slices/asset';
import { useNavigate } from 'react-router-dom';
import { getWorkOrdersByPart } from '../../../slices/workOrder';
import { getFormattedQuantityWithUnit } from './Parts';
import { getFormattedCostPerUnit } from '../../../utils/formatters';

interface PartDetailsProps {
  part: Part;
  handleOpenUpdate: () => void;
  handleOpenDelete: () => void;
}
export default function PartDetails(props: PartDetailsProps) {
  const { part, handleOpenUpdate, handleOpenDelete } = props;
  const { hasEditPermission, hasDeletePermission } = useAuth();
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate, getFormattedCurrency } = useContext(
    CompanySettingsContext
  );
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState<string>('details');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const theme = useTheme();
  const { assetsByPart } = useSelector((state) => state.assets);
  const { workOrdersByPart } = useSelector((state) => state.workOrders);
  const { stocksByPart } = useSelector((state) => state.partStocks);
  const { locationsMini } = useSelector((state) => state.locations);
  const stocks = stocksByPart[part?.id] ?? [];
  const navigate = useNavigate();
  const assets = assetsByPart[part?.id] ?? [];
  const workOrders = workOrdersByPart[part?.id] ?? [];

  // Local shop quantity (kept in sync after transfers without waiting for parent prop)
  const [shopQuantity, setShopQuantity] = useState<number>(part?.quantity ?? 0);

  // Stock Locations dialog state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ locationId: '', quantity: 0, minQuantity: 0 });

  // Transfer dialog state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromType: 'shop' as 'shop' | 'stock',
    fromId: part?.id,
    toType: 'stock' as 'shop' | 'stock',
    toId: 0,
    quantity: 0
  });

  const openAddStock = () => {
    setEditingStock(null);
    setStockForm({ locationId: '', quantity: 0, minQuantity: 0 });
    setStockDialogOpen(true);
  };
  const openEditStock = (s: any) => {
    setEditingStock(s);
    setStockForm({ locationId: s.location.id, quantity: s.quantity, minQuantity: s.minQuantity });
    setStockDialogOpen(true);
  };
  const handleSaveStock = async () => {
    const dto = {
      partId: part.id,
      locationId: Number(stockForm.locationId),
      quantity: stockForm.quantity,
      minQuantity: stockForm.minQuantity
    };
    if (editingStock) {
      await dispatch(updatePartStock(editingStock.id, dto));
    } else {
      await dispatch(createPartStock(dto));
    }
    setStockDialogOpen(false);
  };
  const handleDeleteStock = async (id: number) => {
    await dispatch(deletePartStock(id, part.id));
  };

  const handleExportStockCSV = () => {
    // Sort satellite locations: by quantity desc, then name asc
    const sortedStocks = [...stocks].sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      return (a.location?.name ?? '').localeCompare(b.location?.name ?? '');
    });

    const rows: string[][] = [
      ['Location', 'Quantity', 'Min Quantity'],
      [t('main_shop') + ' (' + t('default') + ')', String(shopQuantity), String(part.minQuantity)],
      ...sortedStocks.map((s) => [
        s.location?.name ?? '',
        String(s.quantity),
        String(s.minQuantity)
      ]),
      [t('total'), String(shopQuantity + stocks.reduce((sum, s) => sum + s.quantity, 0)), '']
    ];

    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${part.name}-stock-locations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleTransfer = async () => {
    const qty = transferForm.quantity;
    await dispatch(transferPartStock({
      fromType: transferForm.fromType,
      fromId: transferForm.fromType === 'shop' ? part.id : Number(transferForm.fromId),
      toType: transferForm.toType,
      toId: transferForm.toType === 'shop' ? part.id : Number(transferForm.toId),
      quantity: qty
    }));
    // Update local shop quantity immediately without waiting for parent prop cycle
    if (transferForm.fromType === 'shop') {
      setShopQuantity((q) => q - qty);
    } else if (transferForm.toType === 'shop') {
      setShopQuantity((q) => q + qty);
    }
    await dispatch(getPartStocks(part.id));
    setTransferOpen(false);
  };
  const tabs = [
    { value: 'details', label: t('details') },
    { value: 'stock_locations', label: t('stock_locations') },
    { value: 'assets', label: t('assets') },
    { value: 'files', label: t('files') },
    { value: 'workOrders', label: t('work_orders') }
    //TODO events
  ];
  const handleTabsChange = (_event: ChangeEvent<{}>, value: string): void => {
    setCurrentTab(value);
    if (value === 'assets' && !assets.length) {
      dispatch(getAssetsByPart(part.id));
    } else if (value === 'workOrders' && !workOrders.length) {
      dispatch(getWorkOrdersByPart(part.id));
    } else if (value === 'stock_locations') {
      dispatch(getPartStocks(part.id));
      if (!locationsMini.length) dispatch(getLocationsMini());
    }
  };
  const BasicField = ({
    label,
    value
  }: {
    label: string | number;
    value: string | number;
  }) => {
    return value ? (
      <Grid item xs={12} lg={6}>
        <Typography variant="h6" sx={{ color: theme.colors.alpha.black[70] }}>
          {label}
        </Typography>
        <Typography variant="h6">{value}</Typography>
      </Grid>
    ) : null;
  };
  const firstFieldsToRender = (part: Part): { label: string; value: any }[] => [
    {
      label: t('name'),
      value: part.name
    },
    {
      label: t('id'),
      value: part.id
    },
    {
      label: t('description'),
      value: part.description
    },
    {
      label: t('category'),
      value: part.category?.name
    },
    {
      label: t('additional_information'),
      value: part.additionalInfos
    },
    {
      label: t('cost'),
      value: getFormattedCostPerUnit(part.cost, part.unit, getFormattedCurrency)
    },
    {
      label: t('quantity'),
      value: getFormattedQuantityWithUnit(part.quantity, part.unit)
    },
    {
      label: t('minimum_quantity'),
      value: getFormattedQuantityWithUnit(part.minQuantity, part.unit)
    },
    {
      label: t('barcode'),
      value: part.barcode
    }
  ];
  const areaFieldsToRender = (part: Part): { label: string; value: any }[] => [
    {
      label: t('area'),
      value: part.area
    }
  ];

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      padding={4}
    >
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h2">{part?.name}</Typography>
          <Typography variant="h6">{part?.description}</Typography>
        </Box>
        <Box>
          {hasEditPermission(PermissionEntity.PARTS_AND_MULTIPARTS, part) && (
            <IconButton onClick={handleOpenUpdate} style={{ marginRight: 10 }}>
              <EditTwoToneIcon color="primary" />
            </IconButton>
          )}
          {hasDeletePermission(PermissionEntity.PARTS_AND_MULTIPARTS, part) && (
            <IconButton onClick={handleOpenDelete}>
              <DeleteTwoToneIcon style={{ cursor: 'pointer' }} color="error" />
            </IconButton>
          )}
        </Box>
      </Grid>
      <Divider />
      <Grid item xs={12}>
        <Tabs
          onChange={handleTabsChange}
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Grid>
      <Grid item xs={12}>
        {currentTab === 'details' && (
          <Box>
            <Grid container spacing={2}>
              {part.image && (
                <Grid
                  item
                  xs={12}
                  lg={12}
                  display="flex"
                  justifyContent="center"
                >
                  <img
                    src={part.image.url}
                    style={{ borderRadius: 5, height: 250, cursor: 'pointer' }}
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                </Grid>
              )}
              <Grid item xs={12} lg={12}>
                <Typography sx={{ mb: 1 }} variant="h4">
                  {t('part_details')}
                </Typography>
                <Grid container spacing={2}>
                  {firstFieldsToRender(part).map((field) => (
                    <BasicField
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} lg={12}>
                <Typography sx={{ mt: 2, mb: 1 }} variant="h4">
                  {t('area_details')}
                </Typography>
                <Grid container spacing={2}>
                  {areaFieldsToRender(part).map((field) => (
                    <BasicField
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} lg={12}>
                <Typography sx={{ mt: 2, mb: 1 }} variant="h4">
                  {t('assigned_people')}
                </Typography>
                <Grid container spacing={2}>
                  {!!part.assignedTo.length && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.colors.alpha.black[70] }}
                      >
                        Assigned users
                      </Typography>
                      {part.assignedTo.map((user) => (
                        <Link
                          key={user.id}
                          href={getUserUrl(user.id)}
                          variant="h6"
                        >{`${user.firstName} ${user.lastName}`}</Link>
                      ))}
                    </Grid>
                  )}
                  {!!part.customers.length && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.colors.alpha.black[70] }}
                      >
                        {t('assigned_customers')}
                      </Typography>
                      {part.customers.map((customer) => (
                        <Link
                          key={customer.id}
                          href={getCustomerUrl(customer.id)}
                          variant="h6"
                        >
                          {customer.name}
                        </Link>
                      ))}
                    </Grid>
                  )}
                  {!!part.vendors.length && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.colors.alpha.black[70] }}
                      >
                        {t('assigned_vendors')}
                      </Typography>
                      {part.vendors.map((vendor) => (
                        <Link
                          key={vendor.id}
                          href={getVendorUrl(vendor.id)}
                          variant="h6"
                        >
                          {vendor.companyName}
                        </Link>
                      ))}
                    </Grid>
                  )}
                  {!!part.teams.length && (
                    <Grid item xs={12} lg={6}>
                      <Typography
                        variant="h6"
                        sx={{ color: theme.colors.alpha.black[70] }}
                      >
                        {t('assigned_teams')}
                      </Typography>
                      {part.teams.map((team) => (
                        <Link
                          key={team.id}
                          href={getTeamUrl(team.id)}
                          variant="h6"
                        >
                          {team.name}
                        </Link>
                      ))}
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )}
        {currentTab === 'stock_locations' && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4">{t('stock_locations')}</Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title={t('export_csv')}>
                  <Button size="small" variant="outlined" onClick={handleExportStockCSV} startIcon={<DownloadTwoToneIcon />}>
                    CSV
                  </Button>
                </Tooltip>
                <Tooltip title={t('transfer_stock')}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SwapHorizTwoToneIcon />}
                    onClick={() => {
                      setTransferForm({ fromType: 'shop', fromId: part.id, toType: 'stock', toId: stocks[0]?.id ?? 0, quantity: 0 });
                      setTransferOpen(true);
                    }}
                    disabled={!stocks.length}
                  >
                    {t('transfer')}
                  </Button>
                </Tooltip>
                {hasEditPermission(PermissionEntity.PARTS_AND_MULTIPARTS, part) && (
                  <Button size="small" variant="contained" startIcon={<AddTwoToneIcon />} onClick={openAddStock}>
                    {t('add_location')}
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* Summary row — shop */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>{t('location')}</strong></TableCell>
                  <TableCell><strong>{t('quantity')}</strong></TableCell>
                  <TableCell><strong>{t('minimum_quantity')}</strong></TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Main shop row */}
                <TableRow>
                  <TableCell>{t('main_shop')} ({t('default')})</TableCell>
                  <TableCell>{getFormattedQuantityWithUnit(shopQuantity, part.unit)}</TableCell>
                  <TableCell>{getFormattedQuantityWithUnit(part.minQuantity, part.unit)}</TableCell>
                  <TableCell />
                </TableRow>
                {/* Satellite location rows */}
                {stocks.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.location?.name}</TableCell>
                    <TableCell>{getFormattedQuantityWithUnit(s.quantity, part.unit)}</TableCell>
                    <TableCell>{getFormattedQuantityWithUnit(s.minQuantity, part.unit)}</TableCell>
                    <TableCell align="right">
                      {hasEditPermission(PermissionEntity.PARTS_AND_MULTIPARTS, part) && (
                        <IconButton size="small" onClick={() => openEditStock(s)}>
                          <EditTwoToneIcon fontSize="small" color="primary" />
                        </IconButton>
                      )}
                      {hasDeletePermission(PermissionEntity.PARTS_AND_MULTIPARTS, part) && (
                        <IconButton size="small" onClick={() => handleDeleteStock(s.id)}>
                          <DeleteTwoToneIcon fontSize="small" color="error" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                {stocks.length > 0 && (
                  <TableRow>
                    <TableCell><strong>{t('total')}</strong></TableCell>
                    <TableCell><strong>{getFormattedQuantityWithUnit(
                      shopQuantity + stocks.reduce((sum, s) => sum + s.quantity, 0), part.unit
                    )}</strong></TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Add/Edit Stock Dialog */}
            <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} fullWidth maxWidth="xs">
              <DialogTitle>{editingStock ? t('edit_location_stock') : t('add_location_stock')}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Select
                    value={stockForm.locationId}
                    onChange={(e) => setStockForm((f) => ({ ...f, locationId: e.target.value as string }))}
                    displayEmpty
                    disabled={!!editingStock}
                  >
                    <MenuItem value="" disabled>{t('select_location')}</MenuItem>
                    {locationsMini
                      .filter((loc) => !stocks.some((s) => s.location?.id === loc.id) || editingStock?.location?.id === loc.id)
                      .map((loc) => (
                        <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                      ))}
                  </Select>
                  <TextField
                    label={t('quantity')}
                    type="number"
                    inputProps={{ min: 0 }}
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                  <TextField
                    label={t('minimum_quantity')}
                    type="number"
                    inputProps={{ min: 0 }}
                    value={stockForm.minQuantity}
                    onChange={(e) => setStockForm((f) => ({ ...f, minQuantity: Number(e.target.value) }))}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setStockDialogOpen(false)}>{t('cancel')}</Button>
                <Button variant="contained" onClick={handleSaveStock} disabled={!stockForm.locationId}>{t('save')}</Button>
              </DialogActions>
            </Dialog>

            {/* Transfer Dialog */}
            <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="xs">
              <DialogTitle>{t('transfer_stock')}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">{t('from')}</Typography>
                  <Select
                    value={transferForm.fromType === 'shop' ? 'shop' : String(transferForm.fromId)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'shop') {
                        setTransferForm((f) => ({ ...f, fromType: 'shop', fromId: part.id }));
                      } else {
                        setTransferForm((f) => ({ ...f, fromType: 'stock', fromId: Number(val) }));
                      }
                    }}
                  >
                    <MenuItem value="shop">{t('main_shop')} ({shopQuantity} {part.unit})</MenuItem>
                    {stocks.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.location?.name} ({s.quantity} {part.unit})</MenuItem>
                    ))}
                  </Select>
                  <Typography variant="subtitle2">{t('to')}</Typography>
                  <Select
                    value={transferForm.toType === 'shop' ? 'shop' : String(transferForm.toId)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'shop') {
                        setTransferForm((f) => ({ ...f, toType: 'shop', toId: part.id }));
                      } else {
                        setTransferForm((f) => ({ ...f, toType: 'stock', toId: Number(val) }));
                      }
                    }}
                  >
                    <MenuItem value="shop">{t('main_shop')}</MenuItem>
                    {stocks.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.location?.name}</MenuItem>
                    ))}
                  </Select>
                  <TextField
                    label={t('quantity')}
                    type="number"
                    inputProps={{ min: 1 }}
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setTransferOpen(false)}>{t('cancel')}</Button>
                <Button variant="contained" onClick={handleTransfer} disabled={!transferForm.quantity || (transferForm.fromType === transferForm.toType && transferForm.fromId === transferForm.toId)}>{t('transfer')}</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
        {currentTab === 'assets' && (
          <Box>
            {assets.length ? (
              <List sx={{ width: '100%' }}>
                {assets.map((asset) => (
                  <ListItemButton
                    key={asset.id}
                    divider
                    onClick={() => navigate(getAssetUrl(asset.id))}
                  >
                    <ListItem
                      secondaryAction={
                        <Typography>
                          {getFormattedDate(asset.createdAt)}
                        </Typography>
                      }
                    >
                      <ListItemText
                        primary={asset.name}
                        secondary={t(asset.status)}
                      />
                    </ListItem>
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">
                  {t('no_asset_related_part')}
                </Typography>
              </Stack>
            )}
          </Box>
        )}
        {currentTab === 'files' && (
          <Box>
            {/*<Box display="flex" justifyContent="right">*/}
            {/*  <Button startIcon={<AddTwoToneIcon fontSize="small" />}>*/}
            {/*    {t('file')}*/}
            {/*  </Button>*/}
            {/*</Box>*/}
            <Box sx={{ width: '100%' }}>
              {part.files.length ? (
                <FilesList
                  confirmMessage={t(
                    'Are you sure you want to remove this file from this Part ?'
                  )}
                  files={part.files}
                  removeDisabled={
                    !hasEditPermission(
                      PermissionEntity.PARTS_AND_MULTIPARTS,
                      part
                    )
                  }
                  onRemove={(id: number) => {
                    dispatch(
                      editPart(part.id, {
                        ...part,
                        files: part.files.filter((f) => f.id !== id)
                      })
                    );
                  }}
                />
              ) : (
                <Stack direction="row" justifyContent="center" width="100%">
                  <Typography variant="h5">{t('no_file_found')}</Typography>
                </Stack>
              )}
            </Box>
          </Box>
        )}
        {currentTab === 'workOrders' && (
          <Box>
            {workOrders.length ? (
              <List sx={{ width: '100%' }}>
                {workOrders.map((workOrder) => (
                  <ListItemButton
                    key={workOrder.id}
                    divider
                    onClick={() => navigate(getWorkOrderUrl(workOrder.id))}
                  >
                    <ListItem
                      secondaryAction={
                        <Typography>
                          {getFormattedDate(workOrder.createdAt)}
                        </Typography>
                      }
                    >
                      <ListItemText
                        primary={workOrder.title}
                        secondary={t(workOrder.status)}
                      />
                    </ListItem>
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Stack direction="row" justifyContent="center" width="100%">
                <Typography variant="h5">{t('no_wo_found')}</Typography>
              </Stack>
            )}
          </Box>
        )}
      </Grid>
      {isImageViewerOpen && (
        <div style={{ zIndex: 100 }}>
          <ImageViewer
            src={[part.image.url]}
            currentIndex={0}
            onClose={() => setIsImageViewerOpen(false)}
            disableScroll={true}
            backgroundStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)'
            }}
            closeOnClickOutside={true}
          />
        </div>
      )}
    </Grid>
  );
}
