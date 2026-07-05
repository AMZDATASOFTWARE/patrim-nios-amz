import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Edit, Trash2, ExternalLink, MapPin, Calendar, Package,
  FileText, Wrench, Plus
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  formatCurrency, calculateCurrentValue, calculateAccumulatedDepreciation,
  calculateMonthlyDepreciation, calculateDepreciationPercentage, getUsefulLifeFromRate
} from '@/lib/depreciation';
import AssetStatusBadge from '@/components/assets/AssetStatusBadge';
import MaintenanceSection from '@/components/assets/MaintenanceSection';
import AssignmentSection from '@/components/assets/AssignmentSection';
import LocationHistoryMini from '@/components/assets/LocationHistoryMini';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import moment from 'moment';

export default function AssetDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const pendingLat = urlParams.get('lat');
  const pendingLng = urlParams.get('lng');
  const pendingAddr = urlParams.get('addr');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const AssetEntity = useWorkspaceEntity('Asset');
  const LocationEntity = useWorkspaceEntity('LocationHistory');
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    const load = async () => {
      // filter do helper injeta workspace_id — impede leitura de ativo de outro tenant pelo id.
      const data = await AssetEntity.filter({ id });
      if (data.length > 0) {
        const found = data[0];
        setAsset(found);
        // Se veio de um QR Scan com localização pendente, registra agora (usuário logado)
        if (pendingLat && pendingLng && workspaceId) {
          LocationEntity.create({
            asset_id: id,
            asset_name: found.name || '',
            latitude: parseFloat(pendingLat),
            longitude: parseFloat(pendingLng),
            address: pendingAddr ? decodeURIComponent(pendingAddr) : '',
            source: 'QR Scan',
            scanned_by: 'Usuário',
            scanned_at: new Date().toISOString(),
          }).catch(() => {});
          // Limpa os parâmetros da URL sem recarregar
          const cleanUrl = `/AssetDetail?id=${id}`;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
      setLoading(false);
    };
    if (workspaceId) load();
  }, [id, workspaceId]);

  const handleDelete = async () => {
    await AssetEntity.del(id);
    navigate('/Assets');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-muted-foreground">Ativo não encontrado</p>
        <Link to="/Assets"><Button className="mt-4">Voltar aos Ativos</Button></Link>
      </div>
    );
  }

  const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
  const currentValue = calculateCurrentValue(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife);
  const accumulated = calculateAccumulatedDepreciation(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife);
  const monthly = calculateMonthlyDepreciation(asset.acquisition_value, asset.residual_value || 0, usefulLife);
  const depPct = calculateDepreciationPercentage(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/Assets" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{asset.name}</h1>
              <AssetStatusBadge status={asset.status} />
            </div>
            <p className="text-muted-foreground mt-1">{asset.category}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/AssetForm?id=${asset.id}`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Ativo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{asset.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Photo + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Image */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {asset.photo_url ? (
            <img src={asset.photo_url} alt={asset.name} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-muted flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="p-4 space-y-2">
            {asset.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {asset.location}
              </div>
            )}
            {asset.purchase_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> Comprado em {moment(asset.purchase_date).format('DD/MM/YYYY')}
              </div>
            )}
            {asset.invoice_url && (
              <a href={asset.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <FileText className="h-4 w-4" /> Ver Nota Fiscal
              </a>
            )}
          </div>
        </div>

        {/* Right - Financial */}
        <div className="lg:col-span-2 space-y-6">
          {/* Values */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Informações Contábeis</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
                <p className="text-xl font-bold text-card-foreground">{formatCurrency(asset.acquisition_value)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Contábil Atual</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(currentValue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Depreciação Acumulada</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(accumulated)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Depreciação Mensal</p>
                <p className="text-lg font-semibold text-card-foreground">{formatCurrency(monthly)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Residual</p>
                <p className="text-lg font-semibold text-card-foreground">{formatCurrency(asset.residual_value || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vida Útil</p>
                <p className="text-lg font-semibold text-card-foreground">{usefulLife} anos ({asset.depreciation_rate}% a.a.)</p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Depreciação</span>
                <span>{depPct.toFixed(1)}%</span>
              </div>
              <Progress value={depPct} className="h-2" />
            </div>
          </div>

          {/* Links */}
          {(asset.external_link || asset.registry_link) && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Links Externos</h2>
              <div className="space-y-2">
                {asset.external_link && (
                  <a href={asset.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> Consulta de Valor
                  </a>
                )}
                {asset.registry_link && (
                  <a href={asset.registry_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> Registro / Cartório / Corretora
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {asset.description && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-2">Descrição</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{asset.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Location History + Map */}
      <LocationHistoryMini assetId={asset.id} />

      {/* Assignment / Responsibility Terms */}
      <AssignmentSection assetId={asset.id} assetName={asset.name} />

      {/* Maintenance History */}
      <MaintenanceSection assetId={asset.id} />
    </div>
  );
}