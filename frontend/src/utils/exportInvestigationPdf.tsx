import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#172633', fontFamily: 'Helvetica' },
  title: { fontSize: 21, marginBottom: 14 },
  section: { marginTop: 18, marginBottom: 8, fontSize: 14 },
  row: { marginBottom: 6, lineHeight: 1.5 },
  image: { width: 220, height: 150, objectFit: 'contain', marginBottom: 8 },
})
const date = (value: any) => (value ? new Date(value).toLocaleString('en-IN') : 'Not recorded')
const money = (value: any) =>
  Number.isFinite(Number(value)) && value != null
    ? `INR ${Number(value).toLocaleString('en-IN')}`
    : 'Not recorded'

export async function exportInvestigationPdf(record: any) {
  const work = record.work || {}
  const reportDocument = (
    <Document title={`ArthaNetra case ${record.caseId}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ArthaNetra Investigation Report</Text>
        <Text style={styles.row}>{record.title}</Text>
        <Text style={styles.row}>
          Case: {record.caseId} | Revision: {record.version} | Status: {record.status}
        </Text>
        <Text style={styles.row}>
          Source: {record.sourceType} / {record.sourceId}
        </Text>
        <Text style={styles.row}>
          Generated: {date(record.generatedAt)} | Source refresh: {date(record.dataFreshness)}
        </Text>
        <Text style={styles.section}>Work Record</Text>
        <Text style={styles.row}>
          District: {work.district || 'Not recorded'} | State: {work.state || 'Not recorded'}
        </Text>
        <Text style={styles.row}>
          Allocation: {money(work.amount ?? work.estimatedCost ?? work.sanctionedAmount)}
        </Text>
        <Text style={styles.row}>
          Progress: {work.progressPercent == null ? 'Not recorded' : `${work.progressPercent}%`}
        </Text>
        <Text style={styles.row}>
          Coordinates: {work.registeredLatitude ?? work.latitude ?? 'Not recorded'},{' '}
          {work.registeredLongitude ?? work.longitude ?? 'Not recorded'} | Source:{' '}
          {work.coordinateSource || 'Not specified'}
        </Text>
        <Text style={styles.section}>Payment Records</Text>
        {record.financials && (
          <View>
            <Text style={styles.row}>
              Successful linked payments: {money(record.financials.successfulPayments)} | Sanctioned
              budget: {money(record.financials.sanctionedAmount)}
            </Text>
            <Text style={styles.row}>
              Excess above sanction: {money(record.financials.excessOverSanction)} | Invalid ledger
              amounts: {record.financials.invalidAmountRecords}
            </Text>
            <Text style={styles.row}>{record.financials.note}</Text>
          </View>
        )}
        <Text style={styles.row}>
          Included {record.completeness.paymentsIncluded} of {record.completeness.paymentCount}{' '}
          linked records. Link available: {record.completeness.paymentLinkAvailable ? 'Yes' : 'No'}.
          Amounts are source records, not a payment clearance certificate.
        </Text>
        {record.payments.map((item: any, index: number) => (
          <Text style={styles.row} key={index}>
            {String(item.transactionId || item.expenditureId || item._id)} |{' '}
            {money(item.amount ?? item.expenditureAmount ?? item.paymentAmount)} |{' '}
            {String(item.status || item.paymentStatus || 'Status not recorded')}
          </Text>
        ))}
        <Text style={styles.section}>Evidence</Text>
        <Text style={styles.row}>
          Included {record.completeness.evidenceIncluded} of {record.completeness.evidenceCount}{' '}
          submissions. Legacy automated results have not been revalidated by the current pipeline.
        </Text>
        {record.evidence.map((item: any) => (
          <View key={item.updateId} wrap={false}>
            <Text style={styles.row}>
              {date(item.serverUploadTime)} | {item.verificationStatus} | Score:{' '}
              {item.overallVerificationScore ?? 'Unassessed'} | Pipeline:{' '}
              {item.strictVerificationVersion || 'Legacy'}
            </Text>
            {item.photoUrl?.startsWith('data:image/jpeg') && (
              <Image style={styles.image} src={item.photoUrl} />
            )}
            <Text style={styles.row}>
              GPS: {item.geoVerification?.status || 'Unassessed'} | Image:{' '}
              {item.imageVerification?.status || 'Unassessed'}
            </Text>
            <Text style={styles.row}>
              {item.imageVerification?.summary || ''} {item.remarks || ''}
            </Text>
          </View>
        ))}
        <Text style={styles.section}>Authority Review History</Text>
        {record.events.map((event: any, index: number) => (
          <View style={styles.row} key={index} wrap={false}>
            <Text>
              {date(event.at)} | {event.action} | {event.actor?.name || event.actor?.email}
            </Text>
            <Text>{event.note}</Text>
          </View>
        ))}
        <Text style={styles.section}>Limitations</Text>
        <Text style={styles.row}>
          {record.governanceNote} GPS and photo capture metadata are client-reported. Regional
          coordinate fallbacks do not verify an exact site. AI confidence is not a probability of
          fraud. Images are included only when stored in a PDF-compatible upload format.
        </Text>
      </Page>
    </Document>
  )
  const blob = await pdf(reportDocument).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `arthanetra-case-${record.caseId}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
