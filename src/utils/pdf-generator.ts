/**
 * Template PDF Generator
 * 
 * Generates printable PDF answer sheets based on template configuration.
 */

import * as Print from 'expo-print';
import { AnswerSheetTemplate, PAPER_DIMENSIONS } from '../types/template';

/**
 * Generate HTML string for the answer sheet based on template config.
 */
export function generateTemplateHTML(template: AnswerSheetTemplate): string {
  const { name, totalQuestions, optionsPerQuestion, columns, answerGrid, markers, paperSize } = template;
  const paperDims = PAPER_DIMENSIONS[paperSize];
  
  const options = 'ABCDE'.slice(0, optionsPerQuestion).split('');
  
  // Calculate questions per column
  const questionsPerColumn = Math.ceil(totalQuestions / columns);
  
  let gridHtml = '';
  
  for (let col = 0; col < columns; col++) {
    const startQ = col * questionsPerColumn + 1;
    const endQ = Math.min((col + 1) * questionsPerColumn, totalQuestions);
    
    if (startQ > totalQuestions) break;
    
    gridHtml += `
      <div class="column">
        <table>
          <thead>
            <tr>
              <th class="col-num">No</th>
              ${options.map(opt => `<th>${opt}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;
    
    for (let q = startQ; q <= endQ; q++) {
      gridHtml += `
        <tr>
          <td class="col-num">${q}</td>
          ${options.map(() => `<td class="option-cell"><div class="bubble"></div></td>`).join('')}
        </tr>
      `;
    }
    
    gridHtml += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  // CSS mapping from mm to pt (approx 2.83465 pt per mm)
  // But we use mm directly in CSS for printing.
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: ${paperSize === 'A4' ? 'A4' : '8.5in 13in'};
          margin: 0;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          width: ${paperDims.width}mm;
          height: ${paperDims.height}mm;
          position: relative;
          box-sizing: border-box;
          background: white;
        }
        
        /* Markers */
        .marker {
          position: absolute;
          background-color: black;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-inner {
          background-color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-dot {
          background-color: black;
          border-radius: 50%;
        }
        
        .marker-tl { top: ${markers.topLeft.y}mm; left: ${markers.topLeft.x}mm; width: ${markers.topLeft.size}mm; height: ${markers.topLeft.size}mm; }
        .marker-tr { top: ${markers.topRight.y}mm; left: ${markers.topRight.x}mm; width: ${markers.topRight.size}mm; height: ${markers.topRight.size}mm; }
        .marker-bl { top: ${markers.bottomLeft.y}mm; left: ${markers.bottomLeft.x}mm; width: ${markers.bottomLeft.size}mm; height: ${markers.bottomLeft.size}mm; }
        .marker-br { top: ${markers.bottomRight.y}mm; left: ${markers.bottomRight.x}mm; width: ${markers.bottomRight.size}mm; height: ${markers.bottomRight.size}mm; }
        
        .marker-inner { width: 60%; height: 60%; }
        .marker-dot { width: 30%; height: 30%; }
        
        /* Header Info */
        .header {
          position: absolute;
          top: 20mm;
          left: 30mm;
          right: 30mm;
          text-align: center;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 18pt;
          text-transform: uppercase;
        }
        .student-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-top: 15px;
          font-size: 12pt;
          width: 100%;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
          width: 100%;
        }
        .info-label {
          width: 70px;
          text-align: left;
        }
        .info-line {
          flex-grow: 1;
          border-bottom: 1px solid black;
          margin-left: 10px;
        }
        
        /* Answer Grid */
        .grid-container {
          position: absolute;
          top: ${answerGrid.startY}mm;
          left: ${answerGrid.startX}mm;
          display: flex;
          gap: ${answerGrid.columnGap}mm;
        }
        
        table {
          border-collapse: collapse;
          border: 2px solid black;
        }
        th, td {
          border: 1px solid black;
          text-align: center;
          padding: 0;
          height: ${answerGrid.cellHeight}mm;
        }
        th {
          height: 10mm;
          font-weight: bold;
        }
        
        .col-num {
          width: ${answerGrid.numberColumnWidth}mm;
          font-weight: bold;
        }
        .option-cell {
          width: ${answerGrid.cellWidth}mm;
        }
        .bubble {
          width: 60%;
          height: 60%;
          border: 1px solid #333;
          margin: 0 auto;
          /* If square: */
          /* If rounded: border-radius: 50%; */
        }
        
        .instructions {
          position: absolute;
          bottom: 20mm;
          left: 30mm;
          right: 30mm;
          font-size: 10pt;
          border: 1px dashed #999;
          padding: 10px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- Markers -->
      <div class="marker marker-tl"><div class="marker-inner"><div class="marker-dot"></div></div></div>
      <div class="marker marker-tr"><div class="marker-inner"><div class="marker-dot"></div></div></div>
      <div class="marker marker-bl"><div class="marker-inner"><div class="marker-dot"></div></div></div>
      <div class="marker marker-br"><div class="marker-inner"><div class="marker-dot"></div></div></div>
      
      <div class="header">
        <h1>LEMBAR JAWABAN UJIAN</h1>
        <div class="student-info">
          <div class="info-row"><span class="info-label">Nama</span>:<div class="info-line"></div></div>
          <div class="info-row"><span class="info-label">Kelas</span>:<div class="info-line"></div></div>
          <div class="info-row"><span class="info-label">No. Absen</span>:<div class="info-line"></div></div>
        </div>
      </div>
      
      <div class="grid-container">
        ${gridHtml}
      </div>
      
      <div class="instructions">
        <strong>Petunjuk Pengisian:</strong><br/>
        Hitamkan (■) atau berikan tanda silang (X) pada kotak jawaban yang menurut Anda paling benar.<br/>
        Pastikan lembar jawaban tidak terlipat atau robek.
      </div>
    </body>
    </html>
  `;
}

/**
 * Print or export the template as PDF.
 */
export async function printTemplate(template: AnswerSheetTemplate): Promise<void> {
  try {
    const html = generateTemplateHTML(template);
    
    // In a real device this opens the print dialog
    await Print.printAsync({
      html,
      // Pass printer options if needed
    });
  } catch (error) {
    console.error('Error printing template:', error);
    throw error;
  }
}
