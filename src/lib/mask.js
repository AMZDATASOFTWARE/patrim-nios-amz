/**
 * Máscaras de dados pessoais para exibição (minimização — LGPD Art. 6º).
 * O valor completo permanece no banco; só a apresentação é reduzida.
 */

// Mascara um CPF mantendo apenas os 3 primeiros e os 2 últimos dígitos.
// Ex.: "123.456.789-01" -> "123.•••.•••-01". Para o termo/PDF (necessidade
// jurídica) use o valor completo, não esta função.
export function maskCpf(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return cpf ? '•••.•••.•••-••' : '';
  return `${digits.slice(0, 3)}.•••.•••-${digits.slice(9, 11)}`;
}
