// src/BudgetInsights.js
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getBudgetInsights } from './aiService';
import { formatMoneyFull } from './budgetService';
import { COLORS, SPACING, RADIUS } from './colors';

const RISK_STYLES = {
  low:    { color: '#10b981', icon: 'shield',       label: 'Low risk' },
  medium: { color: '#f59e0b', icon: 'alert-circle', label: 'Medium risk' },
  high:   { color: '#ef4444', icon: 'alert-octagon', label: 'High risk' },
};

export default function BudgetInsights({ event, expenses, stats }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!event) return;
    setLoading(true);
    setError('');
    const res = await getBudgetInsights(event, expenses, stats);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Could not load insights');
      return;
    }
    setInsights(res.insights);
  }, [event?.id, expenses.length, stats.spent]);

  // Auto-load on first render when we have an event
  useEffect(() => {
    if (event && !insights && !loading) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  // Regenerate when expenses change meaningfully (only if user has opened insights before)
  useEffect(() => {
    if (!insights || loading) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length]);

  if (!event) return null;

  const risk = insights?.risk_level
    ? RISK_STYLES[insights.risk_level] || RISK_STYLES.low
    : RISK_STYLES.low;

  return (
    <View style={styles.wrap}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={14} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>AI Insights</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {insights?.headline || 'Analyzing your budget…'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {insights && !loading ? (
            <TouchableOpacity onPress={load} style={styles.refreshBtn} hitSlop={8}>
              <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            style={styles.expandBtn}
            hitSlop={8}
          >
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Risk + summary pill */}
      {insights && (
        <View style={styles.riskRow}>
          <View style={[styles.riskPill, { backgroundColor: `${risk.color}18` }]}>
            <Feather name={risk.icon} size={13} color={risk.color} />
            <Text style={[styles.riskText, { color: risk.color }]}>
              {risk.label}
            </Text>
          </View>

          {insights.savings_tips?.length > 0 && (
            <View style={[styles.riskPill, { backgroundColor: `${COLORS.primary}18` }]}>
              <Feather name="target" size={13} color={COLORS.primary} />
              <Text style={[styles.riskText, { color: COLORS.primary }]}>
                {insights.savings_tips.length} saving{' '}
                {insights.savings_tips.length === 1 ? 'tip' : 'tips'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Loading */}
      {loading && !insights && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing expenses…</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Insights (only when expanded) */}
      {insights && expanded && (
        <View style={styles.body}>
          {/* Insights list */}
          {insights.insights?.map((item, i) => (
            <View key={i} style={styles.insightRow}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: `${item.color || COLORS.primary}20` },
                ]}
              >
                <Feather
                  name={item.icon || 'info'}
                  size={16}
                  color={item.color || COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightDesc}>{item.description}</Text>
              </View>
            </View>
          ))}

          {/* Savings tips */}
          {insights.savings_tips?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Save money</Text>
              {insights.savings_tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Feather name="trending-down" size={14} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tipTop}>
                      <Text style={styles.tipTitle}>{tip.title}</Text>
                      {tip.potential_saving ? (
                        <Text style={styles.tipSaving}>{tip.potential_saving}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.tipDetail}>{tip.detail}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Suggested allocations */}
          {insights.suggested_allocations?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Suggested split</Text>
              <View style={styles.allocRow}>
                {insights.suggested_allocations.map((a, i) => (
                  <View key={i} style={styles.allocChip}>
                    <Text style={styles.allocPercent}>{a.percent}%</Text>
                    <Text style={styles.allocCategory} numberOfLines={1}>
                      {a.category}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  subtitle: {
    fontSize: 12, color: COLORS.textMuted,
    marginTop: 2, maxWidth: 220,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 6 },
  expandBtn: { padding: 6 },

  // Risk row
  riskRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  riskText: {
    fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Loading / error
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingVertical: 6,
  },
  loadingText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#fef2f2',
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  retryText: { color: COLORS.danger, fontWeight: '800', fontSize: 12 },

  // Body
  body: { marginTop: SPACING.lg },

  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  insightIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  insightTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  insightDesc: {
    fontSize: 12.5, color: COLORS.textMuted,
    marginTop: 3, lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  // Tip
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  tipIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${COLORS.success}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  tipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tipTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.text, flex: 1 },
  tipSaving: { fontSize: 12, fontWeight: '800', color: COLORS.success },
  tipDetail: {
    fontSize: 12.5, color: COLORS.textMuted,
    marginTop: 2, lineHeight: 17,
  },

  // Alloc chips
  allocRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.full,
  },
  allocPercent: {
    fontSize: 12, fontWeight: '800',
    color: COLORS.primary,
  },
  allocCategory: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.text, maxWidth: 100,
  },
});