import Asset from '../../../../models/owns/asset';
import { Box, Button, Card, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../store';
import { useContext, useEffect, useState, useMemo } from 'react';
import { getAssetWorkOrders } from '../../../../slices/asset';
import { useNavigate } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import Loading from '../../Analytics/Loading';
import ArrowUpwardTwoToneIcon from '@mui/icons-material/ArrowUpwardTwoTone';
import ArrowDownwardTwoToneIcon from '@mui/icons-material/ArrowDownwardTwoTone';

interface PropsType {
  asset: Asset;
}

type SortOrder = 'latest' | 'oldest';

const AssetWorkOrders = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { assetInfos, loadingGet } = useSelector((state) => state.assets);
  const workOrders = assetInfos[asset?.id]?.workOrders;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  useEffect(() => {
    if (asset) dispatch(getAssetWorkOrders(asset.id));
  }, [asset]);

  const sortedWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    const sorted = [...workOrders];
    if (sortOrder === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  }, [workOrders, sortOrder]);

  if (loadingGet)
    return (
      <Box
        sx={{
          height: '50vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Loading />
      </Box>
    );
  return (
    <Box sx={{ px: 4 }}>
      {workOrders?.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant={sortOrder === 'latest' ? 'contained' : 'outlined'}
            startIcon={<ArrowDownwardTwoToneIcon />}
            onClick={() => setSortOrder('latest')}
          >
            {t('latest_first')}
          </Button>
          <Button
            variant={sortOrder === 'oldest' ? 'contained' : 'outlined'}
            startIcon={<ArrowUpwardTwoToneIcon />}
            onClick={() => setSortOrder('oldest')}
          >
            {t('oldest_first')}
          </Button>
        </Stack>
      )}
      <Grid container spacing={2}>
        {sortedWorkOrders?.length ? (
          sortedWorkOrders.map((workOrder) => (
            <Grid key={workOrder.id} item xs={12}>
              <Card
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/app/work-orders/${workOrder.id}`)}
              >
                <Box
                  sx={{
                    p: 2,
                    flexDirection: 'row',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      {workOrder.title}
                    </Typography>
                    <Typography variant="subtitle1">{`#${workOrder.id}`}</Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    color={workOrder.dueDate ? 'error' : 'primary'}
                  >
                    {workOrder.dueDate
                      ? t('due_at_date', {
                          date: getFormattedDate(workOrder.dueDate)
                        })
                      : t('no_due_date')}
                  </Typography>
                  <Typography variant="h6">
                    {workOrder.primaryUser
                      ? `${workOrder.primaryUser.firstName} ${workOrder.primaryUser.lastName}`
                      : t('no_primary_worker')}
                  </Typography>
                  <Typography variant="h6">{t(workOrder.status)}</Typography>
                </Box>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Card>
              <Box
                sx={{
                  height: 500,
                  p: 2,
                  flexDirection: 'row',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="h4">{t('no_wo_linked_asset')}</Typography>
              </Box>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssetWorkOrders;
