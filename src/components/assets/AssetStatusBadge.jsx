const statusStyles = {
  'Ativo': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Em Manutenção': 'bg-amber-100 text-amber-700 border-amber-200',
  'Inativo': 'bg-gray-100 text-gray-600 border-gray-200',
  'Alienado': 'bg-red-100 text-red-700 border-red-200',
};

export default function AssetStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles['Ativo']}`}>
      {status || 'Ativo'}
    </span>
  );
}