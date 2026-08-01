/**
 * Export Service
 * 
 * Exports class summaries and grading results to CSV or PDF.
 */

import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ClassSummary, GradingResult } from '../types/result';

export async function exportSummaryToCSV(summary: ClassSummary): Promise<void> {
  const { results, answerKeyName, subject } = summary;
  
  if (results.length === 0) {
    throw new Error('Tidak ada data untuk diexport');
  }

  // Generate CSV Header
  const firstResult = results[0];
  const maxQuestions = firstResult.totalQuestions;
  
  let csvContent = `Nama Siswa,No. Absen,Nilai Akhir,Skor Mentah,Benar,Salah,Kosong`;
  
  // Add question columns
  for (let i = 1; i <= maxQuestions; i++) {
    csvContent += `,Q${i}`;
  }
  csvContent += '\n';
  
  // Add student rows
  for (const result of results) {
    let row = `"${result.studentName || 'Tanpa Nama'}","${result.studentNumber || '-'}",${result.finalScore},${result.rawScore},${result.correctCount},${result.wrongCount},${result.blankCount}`;
    
    // Sort details to ensure correct order
    const sortedDetails = [...result.details].sort((a, b) => a.questionNumber - b.questionNumber);
    
    for (const detail of sortedDetails) {
      const ans = detail.detectedAnswer || '-';
      row += `,${ans}`;
    }
    
    csvContent += row + '\n';
  }
  
  // Save using new expo-file-system API
  const fileName = `Rekap_${subject.replace(/\s+/g, '_')}_${answerKeyName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  const file = new File(Paths.document, fileName);
  file.write(csvContent);
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Nilai Ujian (CSV)',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function exportSummaryToPDF(summary: ClassSummary): Promise<void> {
  const { answerKeyName, subject, results, averageScore, highestScore, lowestScore } = summary;
  
  const date = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  
  // Sort results alphabetically by name, or by score
  const sortedResults = [...results].sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1 {
          text-align: center;
          margin-bottom: 5px;
          font-size: 24px;
        }
        h2 {
          text-align: center;
          color: #666;
          margin-top: 0;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .stats-container {
          display: flex;
          justify-content: space-between;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .stat-box {
          text-align: center;
        }
        .stat-val {
          font-size: 20px;
          font-weight: bold;
          color: #4F46E5;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px 8px;
          text-align: left;
        }
        th {
          background-color: #4F46E5;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .text-center {
          text-align: center;
        }
        .score-col {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>REKAPITULASI NILAI UJIAN</h1>
      <h2>${subject ? subject + ' - ' : ''}${answerKeyName}<br/>${date}</h2>
      
      <div class="stats-container">
        <div class="stat-box">
          <div class="stat-val">${results.length}</div>
          <div class="stat-label">Total Siswa</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${averageScore}</div>
          <div class="stat-label">Rata-rata</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${highestScore}</div>
          <div class="stat-label">Nilai Tertinggi</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${lowestScore}</div>
          <div class="stat-label">Nilai Terendah</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th width="5%">No</th>
            <th width="35%">Nama Siswa</th>
            <th width="15%" class="text-center">No. Absen</th>
            <th width="15%" class="text-center">Benar</th>
            <th width="15%" class="text-center">Salah</th>
            <th width="15%" class="text-center">Nilai Akhir</th>
          </tr>
        </thead>
        <tbody>
          ${sortedResults.map((r, index) => `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${r.studentName || 'Tanpa Nama'}</td>
              <td class="text-center">${r.studentNumber || '-'}</td>
              <td class="text-center">${r.correctCount}</td>
              <td class="text-center">${r.wrongCount}</td>
              <td class="text-center score-col">${r.finalScore}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  try {
    const { uri } = await Print.printToFileAsync({ html });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Nilai Ujian (PDF)',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
