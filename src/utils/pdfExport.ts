// MedVerify PDF Export Module
import jsPDF from 'jspdf';
import { VerificationReport, formatOutcome } from '../utils/verification';

export function exportReportAsPDF(report: VerificationReport): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Colors
  const emeraldDeep = [36, 76, 58];
  const textDark = [32, 39, 32];
  const gold = [197, 161, 91];
  const warning = [232, 117, 112];
  const positive = [64, 201, 162];

  // Header
  doc.setFontSize(22);
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('MedVerify', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('Medicine Packaging Intelligence Report', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Divider
  doc.setDrawColor(...gold as [number, number, number]);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Timestamp
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Report generated: ${new Date(report.timestamp).toLocaleString('en-IN')}`, 20, y);
  y += 4;
  doc.text(`Data retrieval date: ${report.sourcesChecked.map(s => s.retrievalDate).join(', ')}`, 20, y);
  y += 10;

  // Outcome
  const outcomeInfo = formatOutcome(report.outcome);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  if (report.outcome === 'ALERT_MATCH_FOUND') {
    doc.setTextColor(...warning as [number, number, number]);
  } else if (report.outcome === 'NO_ALERT_FOUND') {
    doc.setTextColor(...positive as [number, number, number]);
  } else {
    doc.setTextColor(...gold as [number, number, number]);
  }
  
  doc.text(`${outcomeInfo.icon} ${outcomeInfo.label}`, 20, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark as [number, number, number]);
  const outcomeDescLines = doc.splitTextToSize(outcomeInfo.description, pageWidth - 40);
  doc.text(outcomeDescLines, 20, y);
  y += outcomeDescLines.length * 4 + 6;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  // Extracted Fields
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('Extracted Fields', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark as [number, number, number]);

  const fields = [
    ['Product Name', report.input.productName || '(not detected)'],
    ['Strength', report.input.strength || '(not detected)'],
    ['Dosage Form', report.input.dosageForm || '(not detected)'],
    ['Manufacturer', report.input.manufacturer || '(not detected)'],
    ['Batch Number', report.input.batchNumber || '(not detected)'],
    ['Manufacturing Date', report.input.manufacturingDate || '(not detected)'],
    ['Expiry Date', report.input.expiryDate || '(not detected)'],
  ];

  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, y);
    y += 5;
  }
  y += 4;

  // Expiry Check
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('Expiry Check', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark as [number, number, number]);
  
  const expiryLines = doc.splitTextToSize(report.expiryCheck.message, pageWidth - 40);
  doc.text(expiryLines, 25, y);
  y += expiryLines.length * 4 + 6;

  // Alert Matching
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('Alert Matching', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark as [number, number, number]);
  
  const matchLines = doc.splitTextToSize(report.matchResult.explanation, pageWidth - 40);
  doc.text(matchLines, 25, y);
  y += matchLines.length * 4 + 6;

  // Warnings
  if (report.warnings.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...warning as [number, number, number]);
    doc.text('Warnings', 20, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textDark as [number, number, number]);
    
    for (const warning of report.warnings) {
      const wLines = doc.splitTextToSize(`• ${warning}`, pageWidth - 45);
      doc.text(wLines, 25, y);
      y += wLines.length * 4 + 2;
    }
    y += 4;
  }

  // Next Steps
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('Suggested Next Steps', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark as [number, number, number]);
  
  for (const step of report.nextSteps) {
    const sLines = doc.splitTextToSize(`• ${step}`, pageWidth - 45);
    doc.text(sLines, 25, y);
    y += sLines.length * 4 + 2;
  }
  y += 4;

  // Sources
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldDeep as [number, number, number]);
  doc.text('Sources Checked', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark as [number, number, number]);
  
  for (const source of report.sourcesChecked) {
    const srcLines = doc.splitTextToSize(
      `• ${source.name} (${source.publisher}) — Retrieved: ${source.retrievalDate} — Records: ${source.recordCount}`,
      pageWidth - 45
    );
    doc.text(srcLines, 25, y);
    y += srcLines.length * 3.5 + 1;
    
    const limLines = doc.splitTextToSize(`  Limitations: ${source.limitations}`, pageWidth - 50);
    doc.setTextColor(128, 128, 128);
    doc.text(limLines, 30, y);
    y += limLines.length * 3.5 + 3;
    doc.setTextColor(...textDark as [number, number, number]);
  }
  y += 4;

  // Check if we need a new page for disclaimer
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Disclaimer
  doc.setDrawColor(...gold as [number, number, number]);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...warning as [number, number, number]);
  doc.text('SAFETY DISCLAIMER', 20, y);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark as [number, number, number]);
  const disclaimerLines = doc.splitTextToSize(report.disclaimer, pageWidth - 40);
  doc.text(disclaimerLines, 20, y);
  y += disclaimerLines.length * 3.5 + 4;

  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text('This report is NOT a certificate of authenticity. It documents the checks performed and their results.', 20, y);

  // Save
  doc.save(`MedVerify-Report-${new Date(report.timestamp).toISOString().slice(0, 10)}.pdf`);
}
