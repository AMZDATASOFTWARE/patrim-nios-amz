/**
 * Alertas derivados dos ativos (garantia / próxima revisão vencendo).
 * Computados no cliente — não precisam de registro em banco e sempre refletem
 * o estado atual dos ativos. Reutilizado pelo sino e pela central de notificações.
 */
import moment from 'moment';

const WINDOW_DAYS = 30;

export function buildDerivedAlerts(assets = []) {
  const today = moment().startOf('day');
  const alerts = [];

  for (const a of assets) {
    if (a.status === 'Alienado' || a.status === 'Inativo') continue;

    if (a.warranty_expiry_date) {
      const d = moment(a.warranty_expiry_date);
      const diff = d.diff(today, 'days');
      if (diff >= 0 && diff <= WINDOW_DAYS) {
        alerts.push({
          id: `warranty-${a.id}`,
          title: `Garantia vencendo: ${a.name}`,
          body: `A garantia vence em ${d.format('DD/MM/YYYY')} (${diff === 0 ? 'hoje' : `em ${diff} dia(s)`}).`,
          type: 'warning',
          link: `/AssetDetail?id=${a.id}`,
          when: null,
        });
      }
    }

    if (a.next_review_date) {
      const d = moment(a.next_review_date);
      const diff = d.diff(today, 'days');
      if (diff >= 0 && diff <= WINDOW_DAYS) {
        alerts.push({
          id: `review-${a.id}`,
          title: `Revisão programada: ${a.name}`,
          body: `Próxima revisão em ${d.format('DD/MM/YYYY')} (${diff === 0 ? 'hoje' : `em ${diff} dia(s)`}).`,
          type: 'info',
          link: `/AssetDetail?id=${a.id}`,
          when: null,
        });
      }
    }
  }

  return alerts;
}
