const { test } = require('node:test')
const assert = require('node:assert/strict')
const { summarizeLedger } = require('../services/financialReconciliation')
test('only successful ledger rows count as paid and estimates are not sanctions', () => {
  const result = summarizeLedger({ recommendedAmount: 100 }, [
    { _id: 'Success', records: 2, amount: 150, invalidAmounts: 0 },
    { _id: 'failed', records: 1, amount: 900, invalidAmounts: 0 },
    { _id: 'unknown', records: 1, amount: 0, invalidAmounts: 1 },
  ])
  assert.equal(result.successfulPayments, 150)
  assert.equal(result.sanctionedAmount, null)
  assert.equal(result.excessOverSanction, null)
  assert.equal(result.invalidAmountRecords, 1)
  assert.equal(
    summarizeLedger({ sanctionedAmount: 100 }, [{ _id: 'success', amount: 150, invalidAmounts: 0 }])
      .excessOverSanction,
    50
  )
})
