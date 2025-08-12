/**
 * Simple webhook notifier for budget alerts.
 * Set WEBHOOK_BUDGET_ALERT_URLS as a comma-separated list of URLs to enable.
 */
export type BudgetAlertPayload = {
  projectId: string;
  projectName?: string;
  threshold: number; // percent crossed
  budget?: number;
  totalExpense?: number;
  percent?: number;
  link?: string;
};

export async function sendBudgetAlertWebhooks(payload: BudgetAlertPayload) {
  try {
    const urls = (process.env.WEBHOOK_BUDGET_ALERT_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!urls.length) return;

    const body = {
      type: 'BUDGET_ALERT',
      ...payload,
      timestamp: new Date().toISOString(),
    };

    await Promise.allSettled(urls.map(async (url) => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (e) {
        console.warn('Budget webhook failed:', e);
      }
    }));
  } catch (e) {
    console.warn('Budget webhook dispatch failed:', e);
  }
}
