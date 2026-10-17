function summarizeLedger(work, groups) {
  const successful = new Set(['success', 'successful', 'paid', 'completed', 'processed'])
  const paid = groups.filter(group =>
    successful.has(
      String(group._id || '')
        .toLowerCase()
        .trim()
    )
  )
  const successfulPayments = paid.reduce((sum, group) => sum + group.amount, 0)
  const invalidAmountRecords = groups.reduce((sum, group) => sum + group.invalidAmounts, 0)
  const sanctionedAmount = Number(work.sanctionedAmount)
  const hasSanction =
    work.sanctionedAmount !== undefined &&
    work.sanctionedAmount !== null &&
    Number.isFinite(sanctionedAmount)
  return {
    successfulPayments,
    paymentStatusBreakdown: groups,
    invalidAmountRecords,
    sanctionedAmount: hasSanction ? sanctionedAmount : null,
    excessOverSanction: hasSanction ? Math.max(0, successfulPayments - sanctionedAmount) : null,
    reportedFinalAmount: work.finalAmount ?? null,
    recommendedEstimate: work.recommendedAmount ?? null,
    note: 'Successful payments are reconciled across all linked ledger rows, not just the displayed page. Recommendation estimates and final reported values are not treated as sanctioned budgets. Missing records are not evidence of misuse.',
  }
}
async function reconcilePayments(db, query, work) {
  const groups = await db
    .collection('expenditures')
    .aggregate([
      { $match: query },
      {
        $project: {
          status: { $toLower: { $ifNull: ['$paymentStatus', 'unknown'] } },
          amount: {
            $convert: { input: '$expenditureAmount', to: 'double', onError: null, onNull: null },
          },
        },
      },
      {
        $group: {
          _id: '$status',
          records: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$amount', 0] } },
          invalidAmounts: { $sum: { $cond: [{ $eq: ['$amount', null] }, 1, 0] } },
        },
      },
    ])
    .toArray()
  return summarizeLedger(work, groups)
}
module.exports = { reconcilePayments, summarizeLedger }
