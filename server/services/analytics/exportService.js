const PDFDocument = require('pdfkit');

/**
 * Export Service for CSV, Excel-Compatible, and PDF Reports.
 * Implements formula injection sanitization and enterprise reporting formats.
 */

// 1. Formula Injection Sanitization (CSV & Spreadsheet safety)
function sanitizeFormula(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`; // Prefix with single quote to prevent spreadsheet execution
  }
  return str;
}

// 2. Safe CSV Field Escaping
function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  let str = sanitizeFormula(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV representation from rows and header definitions
 */
function generateCsv(dataRows, columns) {
  if (!dataRows || !Array.isArray(dataRows)) return '';

  const headerLine = columns.map(c => escapeCsvField(c.header)).join(',');
  const lines = [headerLine];

  dataRows.forEach(row => {
    const rowValues = columns.map(col => {
      const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
      return escapeCsvField(val);
    });
    lines.push(rowValues.join(','));
  });

  // Include UTF-8 BOM so Excel opens non-ASCII properly
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Generate Excel-Compatible XML Spreadsheet
 */
function generateExcelXml(title, summaryKpis = {}, dataRows = [], columns = []) {
  const generatedAt = new Date().toISOString();

  let kpiRowsHtml = '';
  if (summaryKpis && Object.keys(summaryKpis).length > 0) {
    kpiRowsHtml = `
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="${columns.length}">MUNICIPAL EXECUTIVE SUMMARY &amp; KPIS</td>
      </tr>
      ${Object.entries(summaryKpis).map(([k, v]) => `
        <tr>
          <td colspan="2" style="font-weight: bold; background-color: #f1f5f9;">${k}</td>
          <td colspan="${Math.max(1, columns.length - 2)}">${v}</td>
        </tr>
      `).join('')}
      <tr><td colspan="${columns.length}"></td></tr>
    `;
  }

  const tableHeaderHtml = `
    <tr style="background-color: #10b981; color: #ffffff; font-weight: bold;">
      ${columns.map(c => `<th style="border: 1px solid #cbd5e1; padding: 8px;">${c.header}</th>`).join('')}
    </tr>
  `;

  const tableBodyHtml = dataRows.map(row => `
    <tr>
      ${columns.map(col => {
        const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        const sanitized = sanitizeFormula(val);
        return `<td style="border: 1px solid #e2e8f0; padding: 6px;">${sanitized != null ? sanitized : ''}</td>`;
      }).join('')}
    </tr>
  `).join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #059669; color: white; border: 1px solid #047857; text-align: left; }
        td { border: 1px solid #cbd5e1; }
      </style>
    </head>
    <body>
      <h2 style="color: #047857; margin-bottom: 4px;">CIVIC GREENNET — ${title.toUpperCase()}</h2>
      <p style="color: #64748b; font-size: 10pt; margin-top: 0;">Generated: ${generatedAt} · Official Municipal Governance Report</p>
      <table>
        ${kpiRowsHtml}
        ${tableHeaderHtml}
        ${tableBodyHtml}
      </table>
    </body>
    </html>
  `;
}

/**
 * 4. Generate Structured PDF / Printable Report HTML
 */
function generatePdfReportHtml(title, metadata = {}, kpis = {}, tables = []) {
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - Civic GreenNet Governance</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 10pt; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 18px; }
        .title { font-size: 18pt; font-weight: bold; color: #0f172a; margin: 0; }
        .subtitle { font-size: 9pt; color: #64748b; margin-top: 2px; }
        .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
        .kpi-label { font-size: 7.5pt; text-transform: uppercase; font-weight: bold; color: #64748b; }
        .kpi-val { font-size: 14pt; font-weight: bold; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; font-size: 8.5pt; }
        th { background: #f1f5f9; color: #334155; font-weight: bold; text-align: left; padding: 6px 8px; border-bottom: 1.5px solid #cbd5e1; }
        td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${title}</h1>
          <div class="subtitle">Civic GreenNet Municipal Governance · Generated on ${generatedAt}</div>
        </div>
        <div class="badge">OFFICIAL REPORT</div>
      </div>

      ${Object.keys(kpis).length > 0 ? `
        <div class="kpi-grid">
          ${Object.entries(kpis).map(([k, v]) => `
            <div class="kpi-box">
              <div class="kpi-label">${k}</div>
              <div class="kpi-val">${v}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${tables.map(t => `
        <div>
          <h3 style="font-size: 11pt; color: #0f172a; margin-bottom: 4px;">${t.title}</h3>
          <table>
            <thead>
              <tr>
                ${t.columns.map(c => `<th>${c}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${t.rows.map(r => `
                <tr>
                  ${r.map(cell => `<td>${cell != null ? cell : ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <div class="footer">
        <div>Civic GreenNet Municipal Decision Intelligence Platform</div>
        <div>Confidential &amp; Authorized Governance Record</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 5. Generate Standard Binary PDF Buffer (%PDF-1.4) via PDFKit
 */
function generatePdfBuffer(title, metadata = {}, kpis = {}, tables = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        bufferPages: true,
        info: {
          Title: title,
          Author: 'Civic GreenNet Municipal Governance',
          Subject: 'Municipal Operations Intelligence Report'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const generatedAt = new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 36;
      const contentWidth = pageWidth - (margin * 2);

      // ── 1. Top Header Banner ─────────────────────────────────
      doc.rect(margin, margin, contentWidth, 46).fill('#059669');

      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(title.toUpperCase(), margin + 12, margin + 9, { width: contentWidth - 24 });

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#E6FFFA')
        .text('Civic GreenNet Municipal Governance · Official Operational Intelligence Report', margin + 12, margin + 26);

      doc.y = margin + 54;

      // ── 2. Metadata Bar ──────────────────────────────────────
      const tfText = metadata.timeframe ? `Timeframe: ${metadata.timeframe}` : 'Timeframe: 30 Days';
      const catText = metadata.category && metadata.category !== 'all' ? `Category: ${metadata.category}` : 'Category: All Categories';
      
      doc.fillColor('#64748B')
        .font('Helvetica')
        .fontSize(7.5)
        .text(`Generated: ${generatedAt}  |  ${tfText}  |  ${catText}`, margin, doc.y);

      doc.moveDown(0.7);

      // ── 3. Executive KPI Grid ─────────────────────────────────
      if (kpis && Object.keys(kpis).length > 0) {
        const kpiEntries = Object.entries(kpis);
        const cols = 4;
        const colWidth = (contentWidth - (cols - 1) * 8) / cols;
        const boxHeight = 34;
        let startY = doc.y;

        kpiEntries.forEach(([label, value], idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = margin + (col * (colWidth + 8));
          const y = startY + (row * (boxHeight + 6));

          // Draw KPI Card Background & Border
          doc.rect(x, y, colWidth, boxHeight).fillAndStroke('#F8FAFC', '#E2E8F0');

          // Label
          doc.fillColor('#64748B')
            .font('Helvetica-Bold')
            .fontSize(6.5)
            .text(label.toUpperCase(), x + 6, y + 5, { width: colWidth - 12, ellipsis: true });

          // Value
          doc.fillColor('#0F172A')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(String(value), x + 6, y + 17, { width: colWidth - 12, ellipsis: true });
        });

        const totalKpiRows = Math.ceil(kpiEntries.length / cols);
        doc.y = startY + (totalKpiRows * (boxHeight + 6)) + 10;
      }

      // ── 4. Tables ─────────────────────────────────────────────
      if (tables && tables.length > 0) {
        tables.forEach((table) => {
          const columns = table.columns || [];
          const rows = table.rows || [];

          // Table Section Title
          if (doc.y > pageHeight - 120) {
            doc.addPage();
          }

          doc.fillColor('#0F172A')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(table.title || 'Detailed Operational Data', margin, doc.y);

          doc.moveDown(0.3);

          const colWidth = contentWidth / Math.max(1, columns.length);
          const headerHeight = 16;
          const rowHeight = 15;

          // Helper to draw Table Header
          function drawTableHeader(y) {
            doc.rect(margin, y, contentWidth, headerHeight).fill('#059669');
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
            columns.forEach((col, cIdx) => {
              const cx = margin + (cIdx * colWidth) + 4;
              doc.text(String(col), cx, y + 4, { width: colWidth - 8, ellipsis: true });
            });
            return y + headerHeight;
          }

          let curY = drawTableHeader(doc.y);

          if (rows.length === 0) {
            doc.rect(margin, curY, contentWidth, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
            doc.fillColor('#64748B')
              .font('Helvetica')
              .fontSize(7.5)
              .text('No data available for the selected reporting period.', margin + 8, curY + 6);
            doc.y = curY + 30;
            return;
          }

          // Draw Rows
          rows.forEach((row, rIdx) => {
            if (curY + rowHeight > pageHeight - 45) {
              doc.addPage();
              curY = drawTableHeader(margin);
            }

            // Alternating Row Background
            const bg = rIdx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
            doc.rect(margin, curY, contentWidth, rowHeight).fill(bg);
            doc.rect(margin, curY + rowHeight - 0.5, contentWidth, 0.5).fill('#E2E8F0');

            doc.fillColor('#1E293B').font('Helvetica').fontSize(7);
            row.forEach((cell, cIdx) => {
              const cx = margin + (cIdx * colWidth) + 4;
              doc.text(cell != null ? String(cell) : '', cx, curY + 4, {
                width: colWidth - 8,
                ellipsis: true
              });
            });

            curY += rowHeight;
          });

          doc.y = curY + 12;
        });
      }

      // ── 5. Page Numbering & Footer ────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Footer Divider Line
        doc.rect(margin, pageHeight - 30, contentWidth, 0.5).fill('#CBD5E1');

        // Left Note
        doc.fillColor('#64748B')
          .font('Helvetica')
          .fontSize(6.8)
          .text('Civic GreenNet Municipal Decision Intelligence Platform · Official Governance Record', margin, pageHeight - 22);

        // Right Page Number
        doc.fillColor('#64748B')
          .font('Helvetica')
          .fontSize(6.8)
          .text(`Page ${i + 1} of ${range.count}`, margin, pageHeight - 22, {
            width: contentWidth,
            align: 'right'
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  sanitizeFormula,
  escapeCsvField,
  generateCsv,
  generateExcelXml,
  generatePdfReportHtml,
  generatePdfBuffer
};

