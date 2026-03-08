/**
 * Custom hook untuk import CSV bulanan dan update sisa_anggaran
 * Dengan matching 7-field unique key dan Google Sheets integration
 */

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { BudgetItem } from '@/types/bahanrevisi';
import { supabase } from '@/integrations/supabase/client';
import { parseMonthlyCSV, ParsedMonthlyData, ParsedMonthlyItem, createUniqueKey } from '@/utils/bahanrevisi-monthly-csv-parser';
import { formatDateIndonesia } from '@/utils/bahanrevisi-calculations';

export interface MatchResult {
  matched: number;
  notMatched: number;
  matched_items: Array<{
    item: ParsedMonthlyItem;
    budgetItem: BudgetItem;
  }>;
  not_matched_items: Array<{
    item: ParsedMonthlyItem;
    reason: string;
  }>;
}

interface UseImportMonthlyCSVProps {
  sheetId: string | null;
  budgetItems: BudgetItem[];
  onImportSuccess: (result: MatchResult, parsedData: ParsedMonthlyData) => void;
}

interface ImportError {
  type: 'parse' | 'validation' | 'matching' | 'upload';
  message: string;
  details?: string[];
}

export const useImportMonthlyCSV = ({
  sheetId,
  budgetItems,
  onImportSuccess,
}: UseImportMonthlyCSVProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [parseProgress, setParseProgress] = useState<string>('');

  const matching = useCallback(
    (parsedData: ParsedMonthlyData): MatchResult => {
      console.log('[useImportMonthlyCSV] Starting matching...', {
        parsedItems: parsedData.items.length,
        budgetItems: budgetItems.length,
      });

      const normalizeToken = (value: unknown) =>
        String(value ?? '').trim().replace(/^'+/, '').toLowerCase();

      const normalizeTextToken = (value: unknown) =>
        normalizeToken(value)
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const buildLooseMatchKey = (item: {
        program?: string;
        program_pembebanan?: string;
        kegiatan?: string;
        akun?: string;
        uraian?: string;
      }) => {
        const program = normalizeToken(item.program ?? item.program_pembebanan);
        const kegiatan = normalizeToken(item.kegiatan);
        const akun = normalizeToken(item.akun);
        const uraian = normalizeTextToken(item.uraian);
        return [program, kegiatan, akun, uraian].join('|');
      };

      const buildHierarchyMatchKey = (item: {
        program?: string;
        program_pembebanan?: string;
        kegiatan?: string;
        rincianOutput?: string;
        rincian_output?: string;
        komponenOutput?: string;
        komponen_output?: string;
        subKomponen?: string;
        sub_komponen?: string;
        akun?: string;
      }) => {
        const program = normalizeToken(item.program ?? item.program_pembebanan);
        const kegiatan = normalizeToken(item.kegiatan);
        const rincian = normalizeToken(item.rincianOutput ?? item.rincian_output);
        const komponen = normalizeToken(item.komponenOutput ?? item.komponen_output);
        const subKomponen = normalizeToken(item.subKomponen ?? item.sub_komponen);
        const akun = normalizeToken(item.akun);
        return [program, kegiatan, rincian, komponen, subKomponen, akun].join('|');
      };

      const buildTextMatchKey = (item: {
        program?: string;
        program_pembebanan?: string;
        kegiatan?: string;
        komponenOutput?: string;
        komponen_output?: string;
        akun?: string;
        uraian?: string;
      }) => {
        const program = normalizeToken(item.program ?? item.program_pembebanan);
        const kegiatan = normalizeToken(item.kegiatan);
        const komponen = normalizeToken(item.komponenOutput ?? item.komponen_output);
        const akun = normalizeToken(item.akun);
        const uraian = normalizeTextToken(item.uraian);
        return [program, kegiatan, komponen, akun, uraian].join('|');
      };

      const buildTrioKey = (item: {
        program?: string;
        program_pembebanan?: string;
        kegiatan?: string;
        akun?: string;
      }) => {
        const program = normalizeToken(item.program ?? item.program_pembebanan);
        const kegiatan = normalizeToken(item.kegiatan);
        const akun = normalizeToken(item.akun);
        return [program, kegiatan, akun].join('|');
      };

      const normalizeWords = (value: unknown) => {
        const stopwords = new Set(['di', 'ke', 'dan', 'yang', 'dalam', 'untuk', 'dari', 'kab', 'kota', 'kabkota']);
        return normalizeTextToken(value)
          .split(' ')
          .filter((w) => w && !stopwords.has(w));
      };

      const isCloseUraian = (left: unknown, right: unknown) => {
        const leftWords = normalizeWords(left);
        const rightWords = normalizeWords(right);
        if (leftWords.length === 0 || rightWords.length === 0) return false;

        const leftSet = new Set(leftWords);
        const rightSet = new Set(rightWords);
        let overlap = 0;
        leftSet.forEach((w) => {
          if (rightSet.has(w)) overlap++;
        });

        const minLen = Math.min(leftSet.size, rightSet.size);
        const ratio = minLen > 0 ? overlap / minLen : 0;
        return ratio >= 0.8;
      };

      const getIdPrefix6 = (id: unknown) => {
        const parts = String(id ?? '').split('|').map((part) => normalizeToken(part));
        return parts.length >= 6 ? parts.slice(0, 6).join('|') : '';
      };

      const getIdPrefixWithoutSubKomponen = (id: unknown) => {
        const parts = String(id ?? '').split('|').map((part) => normalizeToken(part));
        return parts.length >= 6
          ? [parts[0], parts[1], parts[2], parts[3], parts[5]].join('|')
          : '';
      };

      const getLevenshteinDistance = (left: string, right: string) => {
        const a = left;
        const b = right;
        const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + cost
            );
          }
        }

        return matrix[a.length][b.length];
      };

      const getUraianSimilarity = (left: unknown, right: unknown) => {
        const leftWords = new Set(normalizeWords(left));
        const rightWords = new Set(normalizeWords(right));
        if (leftWords.size === 0 || rightWords.size === 0) return 0;

        let overlap = 0;
        leftWords.forEach((w) => {
          if (rightWords.has(w)) overlap++;
        });

        const wordScore = overlap / Math.min(leftWords.size, rightWords.size);

        const leftText = normalizeTextToken(left);
        const rightText = normalizeTextToken(right);
        const maxLen = Math.max(leftText.length, rightText.length);
        const charScore = maxLen > 0
          ? 1 - getLevenshteinDistance(leftText, rightText) / maxLen
          : 0;

        // Weighted score: prioritize token overlap but use char similarity to break ties
        return (wordScore * 0.7) + (Math.max(0, charScore) * 0.3);
      };

      const hasStrongContainment = (left: unknown, right: unknown) => {
        const leftText = normalizeTextToken(left);
        const rightText = normalizeTextToken(right);
        if (!leftText || !rightText) return false;

        const shorter = leftText.length <= rightText.length ? leftText : rightText;
        const longer = leftText.length > rightText.length ? leftText : rightText;

        // Guard: avoid matching very short generic fragments
        if (shorter.length < 12) return false;

        return longer.includes(shorter);
      };

      // Merge duplicate parsed rows by ID with fingerprint-safe aggregation
      // - exact duplicate line -> ignored
      // - same ID but different numeric fragment -> periodeIni is accumulated
      const parsedById = new Map<string, ParsedMonthlyItem>();
      const seenFingerprintsById = new Map<string, Set<string>>();
      let duplicateCollapsed = 0;

      dedupedParsedItems: for (const item of parsedData.items) {
        const normalizedId = normalizeToken(item.id);
        if (!normalizedId) continue;

        const itemPeriodeIni = Number(item.periodeIni) || 0;
        const itemSisaAnggaran = Number(item.sisaAnggaran) || 0;
        const uraianFingerprint = normalizeTextToken(item.uraian);
        const fingerprint = `${uraianFingerprint}|${itemPeriodeIni}|${itemSisaAnggaran}`;

        const existing = parsedById.get(normalizedId);
        if (!existing) {
          parsedById.set(normalizedId, { ...item });
          seenFingerprintsById.set(normalizedId, new Set([fingerprint]));
          continue dedupedParsedItems;
        }

        // Merge description fragment safely (avoid duplicate words)
        const existingUraian = normalizeToken(existing.uraian);
        const incomingUraian = normalizeToken(item.uraian);
        if (incomingUraian && !existingUraian.includes(incomingUraian)) {
          existing.uraian = `${existing.uraian} ${item.uraian}`.replace(/\s+/g, ' ').trim();
        }

        const seenFingerprints = seenFingerprintsById.get(normalizedId) ?? new Set<string>();
        if (seenFingerprints.has(fingerprint)) {
          duplicateCollapsed++;
          continue dedupedParsedItems;
        }

        existing.periodeIni = (Number(existing.periodeIni) || 0) + itemPeriodeIni;

        // Keep latest non-zero sisa_anggaran snapshot
        if (itemSisaAnggaran > 0) {
          existing.sisaAnggaran = itemSisaAnggaran;
        }

        seenFingerprints.add(fingerprint);
        seenFingerprintsById.set(normalizedId, seenFingerprints);
      }

      const dedupedParsedItems = Array.from(parsedById.values());
      if (duplicateCollapsed > 0) {
        console.warn(`[useImportMonthlyCSV] Collapsed ${duplicateCollapsed} exact duplicate parsed rows by ID`);
      }

      const result: MatchResult = {
        matched: 0,
        notMatched: 0,
        matched_items: [],
        not_matched_items: [],
      };

      // Build lookup maps
      const budgetItemMap = new Map<string, BudgetItem>();
      const budgetItemIdMap = new Map<string, BudgetItem>();
      const budgetItemTextMap = new Map<string, BudgetItem>();
      const budgetItemTextDuplicates = new Set<string>();
      const budgetItemHierarchyMap = new Map<string, BudgetItem>();
      const budgetItemHierarchyDuplicates = new Set<string>();
      const budgetItemLooseMap = new Map<string, BudgetItem>();
      const budgetItemLooseDuplicates = new Set<string>();
      const budgetItemTrioMap = new Map<string, BudgetItem[]>();
      const budgetItemIdPrefixMap = new Map<string, BudgetItem[]>();
      const budgetItemIdPrefixNoSubMap = new Map<string, BudgetItem[]>();

      budgetItems.forEach((item, idx) => {
        const key = createUniqueKey(item);
        budgetItemMap.set(key, item);

        const normalizedId = normalizeToken(item.id);
        if (normalizedId) budgetItemIdMap.set(normalizedId, item);

        const textKey = buildTextMatchKey(item as any);
        if (textKey && textKey !== '||||') {
          if (budgetItemTextDuplicates.has(textKey)) {
            // already marked ambiguous
          } else if (budgetItemTextMap.has(textKey)) {
            budgetItemTextMap.delete(textKey);
            budgetItemTextDuplicates.add(textKey);
          } else {
            budgetItemTextMap.set(textKey, item);
          }
        }

        const hierarchyKey = buildHierarchyMatchKey(item as any);
        if (hierarchyKey && hierarchyKey !== '|||||') {
          if (budgetItemHierarchyDuplicates.has(hierarchyKey)) {
            // already marked ambiguous
          } else if (budgetItemHierarchyMap.has(hierarchyKey)) {
            budgetItemHierarchyMap.delete(hierarchyKey);
            budgetItemHierarchyDuplicates.add(hierarchyKey);
          } else {
            budgetItemHierarchyMap.set(hierarchyKey, item);
          }
        }

        const looseKey = buildLooseMatchKey(item as any);
        if (looseKey && looseKey !== '|||') {
          if (budgetItemLooseDuplicates.has(looseKey)) {
            // already marked ambiguous
          } else if (budgetItemLooseMap.has(looseKey)) {
            budgetItemLooseMap.delete(looseKey);
            budgetItemLooseDuplicates.add(looseKey);
          } else {
            budgetItemLooseMap.set(looseKey, item);
          }
        }

        const trioKey = buildTrioKey(item as any);
        if (trioKey) {
          const existing = budgetItemTrioMap.get(trioKey) || [];
          existing.push(item);
          budgetItemTrioMap.set(trioKey, existing);
        }

        const idPrefix6 = getIdPrefix6(item.id);
        if (idPrefix6) {
          const existingByPrefix = budgetItemIdPrefixMap.get(idPrefix6) || [];
          existingByPrefix.push(item);
          budgetItemIdPrefixMap.set(idPrefix6, existingByPrefix);
        }

        const idPrefixNoSub = getIdPrefixWithoutSubKomponen(item.id);
        if (idPrefixNoSub) {
          const existingByPrefixNoSub = budgetItemIdPrefixNoSubMap.get(idPrefixNoSub) || [];
          existingByPrefixNoSub.push(item);
          budgetItemIdPrefixNoSubMap.set(idPrefixNoSub, existingByPrefixNoSub);
        }

        if (idx < 3) {
          console.log(`[useImportMonthlyCSV] BudgetItem ${idx + 1}:`, {
            id: item.id,
            program_pembebanan: item.program_pembebanan,
            kegiatan: item.kegiatan,
            akun: item.akun,
            uraian: item.uraian.substring(0, 30),
            key: key.substring(0, 80),
          });
        }
      });

      console.log('[useImportMonthlyCSV] Budget lookup maps created:', {
        byKey: budgetItemMap.size,
        byId: budgetItemIdMap.size,
        byTextKey: budgetItemTextMap.size,
        ambiguousTextKey: budgetItemTextDuplicates.size,
        byHierarchyKey: budgetItemHierarchyMap.size,
        ambiguousHierarchyKey: budgetItemHierarchyDuplicates.size,
        byLooseKey: budgetItemLooseMap.size,
        ambiguousLooseKey: budgetItemLooseDuplicates.size,
        trioBuckets: budgetItemTrioMap.size,
        idPrefix6Buckets: budgetItemIdPrefixMap.size,
        idPrefixNoSubBuckets: budgetItemIdPrefixNoSubMap.size,
      });

      // Match priority: ID first, then composite key fallback
      // IMPORTANT: process non-zero period rows first so meaningful monthly values
      // are matched first.
      const matchedBudgetUsage = new Map<string, number>();
      const parsedItemsForMatching = [...dedupedParsedItems].sort((a, b) => {
        const bVal = Number(b.periodeIni) || 0;
        const aVal = Number(a.periodeIni) || 0;
        return bVal - aVal;
      });

      parsedItemsForMatching.forEach((parsedItem, idx) => {
        const normalizedParsedId = normalizeToken(parsedItem.id);
        const key = createUniqueKey(parsedItem);
        const textKey = buildTextMatchKey(parsedItem as any);
        const hierarchyKey = buildHierarchyMatchKey(parsedItem as any);
        const looseKey = buildLooseMatchKey(parsedItem as any);
        const trioKey = buildTrioKey(parsedItem as any);

        const byId = normalizedParsedId ? budgetItemIdMap.get(normalizedParsedId) : undefined;
        const byKey = budgetItemMap.get(key);
        const byText = textKey ? budgetItemTextMap.get(textKey) : undefined;
        const byHierarchy = hierarchyKey ? budgetItemHierarchyMap.get(hierarchyKey) : undefined;
        const byLoose = looseKey ? budgetItemLooseMap.get(looseKey) : undefined;

        let byHeuristic: BudgetItem | undefined;
        if (!byId && !byKey && !byText && !byHierarchy && !byLoose && trioKey) {
          const trioCandidates = budgetItemTrioMap.get(trioKey) || [];

          const closeCandidates = trioCandidates.filter((candidate) =>
            isCloseUraian(candidate.uraian, parsedItem.uraian)
          );
          if (closeCandidates.length === 1) {
            byHeuristic = closeCandidates[0];
          }
        }

        let byIdPrefix6: BudgetItem | undefined;
        if (!byId && !byKey && !byText && !byHierarchy && !byLoose && !byHeuristic) {
          const parsedPrefix6 = getIdPrefix6(parsedItem.id);
          const prefixCandidates = parsedPrefix6 ? budgetItemIdPrefixMap.get(parsedPrefix6) || [] : [];

          if (prefixCandidates.length === 1) {
            byIdPrefix6 = prefixCandidates[0];
          } else if (prefixCandidates.length > 1) {
            const scored = prefixCandidates
              .map((candidate) => ({
                candidate,
                score: getUraianSimilarity(candidate.uraian, parsedItem.uraian),
                containment: hasStrongContainment(candidate.uraian, parsedItem.uraian),
              }))
              .sort((a, b) => b.score - a.score);

            // High confidence pick
            if (scored[0] && scored[0].score >= 0.68) {
              const gapWithSecond = scored[1] ? scored[0].score - scored[1].score : scored[0].score;
              if (gapWithSecond >= 0.06) {
                byIdPrefix6 = scored[0].candidate;
              }
            }

            // Medium confidence fallback: strong text containment and clear winner
            if (!byIdPrefix6) {
              const containmentCandidates = scored.filter((entry) => entry.containment);
              if (containmentCandidates.length === 1) {
                byIdPrefix6 = containmentCandidates[0].candidate;
              }
            }

            // Relaxed fallback: still require a clear winner
            if (!byIdPrefix6 && scored[0] && scored[0].score >= 0.5) {
              const gapWithSecond = scored[1] ? scored[0].score - scored[1].score : scored[0].score;
              if (gapWithSecond >= 0.12) {
                byIdPrefix6 = scored[0].candidate;
              }
            }

            // Deterministic fallback: if only one candidate remains after previous matched IDs filter
            if (!byIdPrefix6 && scored.length === 1) {
              byIdPrefix6 = scored[0].candidate;
            }
          }
        }

        let byIdPrefixNoSub: BudgetItem | undefined;
        if (!byId && !byKey && !byText && !byHierarchy && !byLoose && !byHeuristic && !byIdPrefix6) {
          const parsedPrefixNoSub = getIdPrefixWithoutSubKomponen(parsedItem.id);
          const noSubCandidates = parsedPrefixNoSub ? budgetItemIdPrefixNoSubMap.get(parsedPrefixNoSub) || [] : [];

          if (noSubCandidates.length === 1) {
            byIdPrefixNoSub = noSubCandidates[0];
          } else if (noSubCandidates.length > 1) {
            const scoredNoSub = noSubCandidates
              .map((candidate) => ({
                candidate,
                score: getUraianSimilarity(candidate.uraian, parsedItem.uraian),
              }))
              .sort((a, b) => b.score - a.score);

            if (scoredNoSub[0] && scoredNoSub[0].score >= 0.62) {
              const gapWithSecond = scoredNoSub[1] ? scoredNoSub[0].score - scoredNoSub[1].score : scoredNoSub[0].score;
              if (gapWithSecond >= 0.08) {
                byIdPrefixNoSub = scoredNoSub[0].candidate;
              }
            }
          }
        }

        const budgetItem = byId || byKey || byText || byHierarchy || byLoose || byHeuristic || byIdPrefix6 || byIdPrefixNoSub;

        if (idx < 5 || parsedItem.kegiatan === '2886' || parsedItem.kegiatan === '2907') {
          console.log(`[useImportMonthlyCSV] ParsedItem ${idx + 1}:`, {
            id: parsedItem.id,
            kegiatan: parsedItem.kegiatan,
            akun: parsedItem.akun,
            uraian: parsedItem.uraian.substring(0, 40),
            matchedBy: byId
              ? 'id'
              : byKey
              ? 'key'
              : byText
              ? 'text-key'
              : byHierarchy
              ? 'hierarchy-key'
              : byLoose
              ? 'loose-key'
              : byHeuristic
              ? 'heuristic-uraian'
              : byIdPrefix6
              ? 'id-prefix6'
              : byIdPrefixNoSub
              ? 'id-prefix-no-sub'
              : 'none',
          });
        }

        if (budgetItem) {
          result.matched++;
          matchedBudgetIds.add(normalizeToken(budgetItem.id));
          result.matched_items.push({
            item: parsedItem,
            budgetItem,
          });
        } else {
          result.notMatched++;
          result.not_matched_items.push({
            item: parsedItem,
            reason: `Tidak ditemukan (id: ${parsedItem.id || '-'}, key: ${key.substring(0, 35)}..., text: ${textKey.substring(0, 35)}..., hierarchy: ${(hierarchyKey || '').substring(0, 35)}..., loose: ${looseKey.substring(0, 35)}...)`,
          });
        }

        if ((idx + 1) % 100 === 0) {
          console.log(`[useImportMonthlyCSV] Matching progress: ${idx + 1}/${parsedItemsForMatching.length}, Matched so far: ${result.matched}`);
        }
      });

      console.log('[useImportMonthlyCSV] Matching complete:', {
        parsedOriginal: parsedData.items.length,
        parsedAfterDedup: dedupedParsedItems.length,
        matched: result.matched,
        notMatched: result.notMatched,
        total: result.matched + result.notMatched,
      });

      const programCounts: Record<string, { matched?: number; unmatched?: number; kegiatan: Set<string> }> = {};
      result.matched_items.forEach(item => {
        const prog = item.item.program || 'UNKNOWN';
        if (!programCounts[prog]) programCounts[prog] = { matched: 0, kegiatan: new Set() };
        programCounts[prog].matched = (programCounts[prog].matched || 0) + 1;
        programCounts[prog].kegiatan.add(item.item.kegiatan);
      });
      result.not_matched_items.forEach(item => {
        const prog = item.item.program || 'UNKNOWN';
        if (!programCounts[prog]) programCounts[prog] = { unmatched: 0, kegiatan: new Set() };
        programCounts[prog].unmatched = (programCounts[prog].unmatched || 0) + 1;
        programCounts[prog].kegiatan.add(item.item.kegiatan);
      });

      console.log('[useImportMonthlyCSV] Items by Program:', programCounts);

      if (result.not_matched_items.length > 0) {
        console.log(`[useImportMonthlyCSV] WARNING: ${result.not_matched_items.length} unmatched items`);
        const unmatchedByKeg: Record<string, number> = {};
        result.not_matched_items.forEach(item => {
          const keg = item.item.kegiatan;
          if (!unmatchedByKeg[keg]) unmatchedByKeg[keg] = 0;
          unmatchedByKeg[keg]++;
        });
        console.log('[useImportMonthlyCSV] Unmatched by Kegiatan:', unmatchedByKeg);
      }

      return result;
    },
    [budgetItems]
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      const errors: ImportError[] = [];

      try {
        setIsImporting(true);
        setImportErrors([]);
        setParseProgress('Parsing CSV...');

        // Parse CSV
        const parsedData = await parseMonthlyCSV(file);

        if (parsedData.errors.length > 0) {
          parsedData.errors.forEach((err) => {
            errors.push({
              type: 'parse',
              message: err,
            });
          });
        }

        if (parsedData.items.length === 0) {
          errors.push({
            type: 'parse',
            message: 'Tidak ada items yang berhasil di-parse',
          });
          setImportErrors(errors);
          return;
        }

        setParseProgress(`Matching dengan BudgetItem (${parsedData.items.length} items)...`);

        // Matching
        const matchResult = matching(parsedData);

        setParseProgress('Validasi hasil matching...');

        const totalPeriodeIniCSV = parsedData.items.reduce((sum, item) => sum + (Number(item.periodeIni) || 0), 0);
        const totalPeriodeIniMatched = matchResult.matched_items.reduce((sum, item) => sum + (Number(item.item.periodeIni) || 0), 0);
        const totalPeriodeIniUnmatched = matchResult.not_matched_items.reduce((sum, item) => sum + (Number(item.item.periodeIni) || 0), 0);

        console.log('[useImportMonthlyCSV] Periode Ini totals check:', {
          csv: totalPeriodeIniCSV,
          matched: totalPeriodeIniMatched,
          unmatched: totalPeriodeIniUnmatched,
          gap: totalPeriodeIniCSV - totalPeriodeIniMatched,
        });

        // Validation
        if (matchResult.matched === 0) {
          errors.push({
            type: 'validation',
            message: 'Tidak ada item yang berhasil dimatching',
            details: [`${matchResult.notMatched} items tidak match. Cek format CSV atau BudgetItem.`],
          });
          setImportErrors(errors);
          return;
        }

        if (matchResult.notMatched > 0) {
          errors.push({
            type: 'validation',
            message: `⚠️ ${matchResult.notMatched} item(s) tidak berhasil dimatching (dari total ${parsedData.items.length})`,
            details: [
              `Selisih realisasi yang belum termapping: ${totalPeriodeIniUnmatched.toLocaleString('id-ID')}`,
              ...matchResult.not_matched_items.slice(0, 3).map((item) => {
                return `Program: ${item.item.program}, Akun: ${item.item.akun}, Uraian: ${item.item.uraian.substring(0, 40)}...`;
              }),
            ],
          });
        }

        // Upload ke Google Sheets
        if (!sheetId) {
          errors.push({
            type: 'upload',
            message: 'Sheet ID tidak ditemukan',
          });
          setImportErrors(errors);
          return;
        }

        setParseProgress('Upload ke Google Sheets...');

        // Prepare data untuk update budget_items - COPY ALL COLUMNS from CSV, not just sisa_anggaran
        const updateData = matchResult.matched_items.map((match) => {
          const updated = { ...match.budgetItem };
          // Update with ALL columns from CSV (periodeIni is for RPD, but other fields go here)
          updated.sub_komponen = match.item.subKomponen;
          updated.sisa_anggaran = match.item.sisaAnggaran;
          updated.updated_date = formatDateIndonesia(new Date().toISOString());
          // No need to set periodeIni here - it's only for RPD items
          
          // Clean up undefined values to avoid serialization issues
          Object.keys(updated).forEach(key => {
            if (updated[key as keyof typeof updated] === undefined) {
              delete updated[key as keyof typeof updated];
            }
          });
          return updated;
        });

        // Prepare data untuk update rpd_items (kolom bulan sesuai periode, plus total_rpd & sisa_anggaran auto-calc)
        // Mapping bulan ke kolom: Jan=I(8), Feb=J(9), ..., Dec=T(19)
        const bulanColumnMap: { [key: number]: string } = {
          1: 'I', 2: 'J', 3: 'K', 4: 'L', 5: 'M', 6: 'N',
          7: 'O', 8: 'P', 9: 'Q', 10: 'R', 11: 'S', 12: 'T'
        };
        const bulanColumn = bulanColumnMap[parsedData.bulan];
        
        // VALIDASI: Pastikan bulan valid (1-12) dan bulanColumn ditemukan
        if (!parsedData.bulan || parsedData.bulan < 1 || parsedData.bulan > 12 || !bulanColumn) {
          errors.push({
            type: 'validation',
            message: `❌ Bulan tidak valid dalam CSV: "${parsedData.bulan}"`,
            details: [
              `Bulan harus antara 1-12. Diterima: ${parsedData.bulan}`,
              `Kolom bulan yang dikembalikan: ${bulanColumn}`,
              `Pastikan format periode CSV sesuai: "Periode Mei 2025" atau "Periode Januari 2025"`
            ],
          });
          setImportErrors(errors);
          setIsImporting(false);
          return;
        }
        
        // RPD updates for MATCHED items
        const rpdUpdateData = matchResult.matched_items.map((match) => {
          return {
            item: match.budgetItem,
            bulan: parsedData.bulan,
            bulanColumn: bulanColumn,
            periodeIni: match.item.periodeIni,
          };
        });

        // DO NOT send unmatched items to rpd_items or budget_items main sheet
        // Unmatched items go ONLY to the versioned sheet and separate unmatched sheet
        // This prevents pagu inflation from accumulating "New" items each upload cycle
        const rpdUnmatchedData: any[] = [];

        // Prepare unmatched items for VERSIONED/UNMATCHED sheet ONLY (not main budget_items)
        const unmatchedData = matchResult.not_matched_items.map((item) => {
          return {
            id: item.item.id,
            program_pembebanan: item.item.program,
            kegiatan: item.item.kegiatan,
            rincian_output: item.item.rincianOutput,
            komponen_output: item.item.komponenOutput,
            sub_komponen: item.item.subKomponen,
            akun: item.item.akun,
            uraian: item.item.uraian,
            periodeIni: item.item.periodeIni,
            volume_semula: 0,
            satuan_semula: '',
            harga_satuan_semula: 0,
            jumlah_semula: 0,
            volume_menjadi: 0,
            satuan_menjadi: '',
            harga_satuan_menjadi: 0,
            jumlah_menjadi: 0,
            selisih: 0,
            sisa_anggaran: item.item.sisaAnggaran,
            blokir: 0,
            status: 'UNMATCHED',
            approved_by: '',
            approved_date: '',
            rejected_date: '',
            submitted_by: 'import',
            submitted_date: formatDateIndonesia(new Date().toISOString()),
            updated_date: formatDateIndonesia(new Date().toISOString()),
            notes: `[Unmatched] ${item.reason}`,
            catatan_ppk: '',
          };
        });

        console.log('[useImportMonthlyCSV] Uploading', updateData.length, 'matched items + ', unmatchedData.length, ' unmatched items to Google Sheets...');
        console.log('[useImportMonthlyCSV] First matched item sample:', updateData[0]);
        if (unmatchedData.length > 0) {
          console.log('[useImportMonthlyCSV] First unmatched item sample:', unmatchedData[0]);
        }

        // Call Google Sheets function dengan timeout
        console.log('[useImportMonthlyCSV] Invoking google-sheets function...', {
          operation: 'update-sisa-anggaran',
          matchedItems: updateData.length,
          unmatchedItems: unmatchedData.length,
          bulan: parsedData.bulan,
          tahun: parsedData.tahun,
        });

        const startTime = Date.now();
        let uploadResult;
        
        try {
          uploadResult = await supabase.functions.invoke('google-sheets', {
            body: {
              spreadsheetId: sheetId,
              operation: 'update-sisa-anggaran',
              values: updateData,
              rpdUpdates: [...rpdUpdateData, ...rpdUnmatchedData],
              unmatchedItems: unmatchedData,
              bulan: parsedData.bulan,
              tahun: parsedData.tahun,
            },
          });
          
          const endTime = Date.now();
          console.log('[useImportMonthlyCSV] Upload result received in', endTime - startTime, 'ms');
          console.log('[useImportMonthlyCSV] Result:', {
            hasError: !!uploadResult.error,
            errorMessage: uploadResult.error?.message,
            statusCode: uploadResult.error?.context?.response?.status,
            data: uploadResult.data,
          });
        } catch (error) {
          console.error('[useImportMonthlyCSV] Error calling edge function:', error);
          console.error('[useImportMonthlyCSV] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            status: error instanceof Error && 'status' in error ? (error as any).status : 'N/A',
          });
          throw new Error(`Edge function error: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (uploadResult.error) {
          console.error('[useImportMonthlyCSV] Upload error:', uploadResult.error);
          errors.push({
            type: 'upload',
            message: 'Gagal upload ke Google Sheets: ' + (uploadResult.error.message || String(uploadResult.error)),
            details: [uploadResult.error.message || uploadResult.error.toString()],
          });
          setImportErrors(errors);
          return;
        }

        const uploadData = uploadResult.data;
        if (!uploadData?.success) {
          console.error('[useImportMonthlyCSV] Upload returned success:false', uploadData);
          errors.push({
            type: 'upload',
            message: 'Gagal update data di Google Sheets',
            details: uploadData?.errors || ['Unknown error during update'],
          });
          setImportErrors(errors);
          return;
        }

        console.log(`[useImportMonthlyCSV] Successfully appended ${uploadData.matched_appended} matched + ${uploadData.unmatched_appended} unmatched items (total: ${uploadData.total_appended})`);

        setParseProgress('');

        // Success - call callback
        onImportSuccess(matchResult, parsedData);

        toast({
          title: '✅ Import Berhasil!',
          description: `${matchResult.matched} item(s) berhasil diupdate untuk ${parsedData.bulan < 10 ? '0' : ''}${parsedData.bulan}/${parsedData.tahun}`,
        });
      } catch (error) {
        console.error('[useImportMonthlyCSV] Error:', error);
        errors.push({
          type: 'parse',
          message: 'Error parsing file',
          details: [error instanceof Error ? error.message : String(error)],
        });
        setImportErrors(errors);

        toast({
          variant: 'destructive',
          title: '❌ Import Gagal',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsImporting(false);
        setParseProgress('');
      }
    },
    [sheetId, matching, onImportSuccess]
  );

  const clearErrors = useCallback(() => {
    setImportErrors([]);
    setParseProgress('');
  }, []);

  return {
    isImporting,
    importErrors,
    parseProgress,
    handleImportFile,
    clearErrors,
  };
};
