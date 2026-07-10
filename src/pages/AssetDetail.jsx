import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Edit, Trash2, ExternalLink, MapPin, Calendar, Package,
  FileText
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  formatCurrency, getUsefulLifeFromRate, getAssetDepreciation
} from '@/lib/depreciation';
import AssetStatusBadge from '@/components/assets/AssetStatusBadge';
import AttachmentsSection from '@/components/assets/AttachmentsSection';
import TransferSection from '@/components/assets/TransferSection';
import MaintenanceSection from '@/components/assets/MaintenanceSection';
import AssignmentSection from '@/components/assets/AssignmentSection';
import LocationHistoryMini from '@/components/assets/LocationHistoryMini';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
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
  const AuditEntity = useWorkspaceEntity('AuditLog');
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const { can } = usePermissions(user);

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
    await logAudit({
      action: 'deleted', entity_type: 'Asset', entity_id: id,
      entity_label: asset?.name || '', summary: `Excluiu o ativo "${asset?.name || ''}"`,
      old_data: asset,
    });
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
  const { currentValue, accumulated, monthly, depPct, cip } = getAssetDepreciation(asset);

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
              {cip && (
                <p className="text-xs text-amber-600 mt-2">Obra em andamento — não deprecia até a conclusão.</p>
              )}
            </div>
          </div>

          {/* Property-specific fields */}
          {asset.category === 'Imóveis' && (asset.property_registration_number || asset.property_registry_office || asset.property_iptu_number || asset.property_area_m2 || asset.property_registration_type) && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Dados do Imóvel</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {asset.property_registration_number && (
                  <div><p className="text-sm text-muted-foreground">Matrícula</p><p className="text-card-foreground">{asset.property_registration_number}</p></div>
                )}
                {asset.property_registry_office && (
                  <div><p className="text-sm text-muted-foreground">Cartório</p><p className="text-card-foreground">{asset.property_registry_office}</p></div>
                )}
                {asset.property_iptu_number && (
                  <div><p className="text-sm text-muted-foreground">IPTU</p><p className="text-card-foreground">{asset.property_iptu_number}</p></div>
                )}
                {!!asset.property_area_m2 && (
                  <div><p className="text-sm text-muted-foreground">Área</p><p className="text-card-foreground">{asset.property_area_m2} m²</p></div>
                )}
                {asset.property_registration_type && (
                  <div><p className="text-sm text-muted-foreground">Tipo de Registro</p><p className="text-card-foreground">{asset.property_registration_type}</p></div>
                )}
              </div>
            </div>
          )}

          {/* Vehicle-specific fields */}
          {asset.category === 'Veículos' && (asset.vehicle_plate || asset.vehicle_renavam || asset.vehicle_chassis || asset.vehicle_ipva_due_date || asset.vehicle_fuel_type || asset.vehicle_model_year) && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Dados do Veículo</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {asset.vehicle_plate && (
                  <div><p className="text-sm text-muted-foreground">Placa</p><p className="text-card-foreground">{asset.vehicle_plate}</p></div>
                )}
                {asset.vehicle_renavam && (
                  <div><p className="text-sm text-muted-foreground">RENAVAM</p><p className="text-card-foreground">{asset.vehicle_renavam}</p></div>
                )}
                {asset.vehicle_chassis && (
                  <div><p className="text-sm text-muted-foreground">Chassi</p><p className="text-card-foreground">{asset.vehicle_chassis}</p></div>
                )}
                {asset.vehicle_model_year && (
                  <div><p className="text-sm text-muted-foreground">Ano/Modelo</p><p className="text-card-foreground">{asset.vehicle_model_year}</p></div>
                )}
                {asset.vehicle_fuel_type && (
                  <div><p className="text-sm text-muted-foreground">Combustível</p><p className="text-card-foreground">{asset.vehicle_fuel_type}</p></div>
                )}
                {asset.vehicle_ipva_due_date && (
                  <div><p className="text-sm text-muted-foreground">Vencimento IPVA</p><p className="text-card-foreground">{moment(asset.vehicle_ipva_due_date).format('DD/MM/YYYY')}</p></div>
                )}
              </div>
            </div>
          )}

          {/* Titularidade / obra em andamento */}
          {((asset.ownership_type && asset.ownership_type !== 'proprio') || asset.is_construction_in_progress) && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Titularidade</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {asset.ownership_type && asset.ownership_type !== 'proprio' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="text-card-foreground capitalize">{{ terceiros: 'Bem de terceiros', locado: 'Locado', comodato: 'Comodato' }[asset.ownership_type] || asset.ownership_type}</p>
                  </div>
                )}
                {asset.real_owner_name && (
                  <div><p className="text-sm text-muted-foreground">Proprietário real</p><p className="text-card-foreground">{asset.real_owner_name}</p></div>
                )}
                {asset.real_owner_document && (
                  <div><p className="text-sm text-muted-foreground">CNPJ/CPF</p><p className="text-card-foreground">{asset.real_owner_document}</p></div>
                )}
                {asset.is_construction_in_progress && (
                  <div>
                    <p className="text-sm text-muted-foreground">Obra em andamento</p>
                    <p className="text-amber-600">Sim{asset.construction_completion_date ? ` — prev. ${moment(asset.construction_completion_date).format('DD/MM/YYYY')}` : ''}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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

      {/* Attachments and Photos */}
      <AttachmentsSection assetId={asset.id} onPrimaryPhotoChange={(url) => setAsset((prev) => ({ ...prev, photo_url: url }))} />

      {/* Location History + Map */}
      <LocationHistoryMini assetId={asset.id} />

      {/* Transferências com aceite do destinatário */}
      <TransferSection assetId={asset.id} assetName={asset.name} canManage={can('manage_transfers')} />

      {/* Assignment / Responsibility Terms */}
      <AssignmentSection assetId={asset.id} assetName={asset.name} />

      {/* Maintenance History */}
      <MaintenanceSection assetId={asset.id} assetName={asset.name} />
    </div>
  );
}