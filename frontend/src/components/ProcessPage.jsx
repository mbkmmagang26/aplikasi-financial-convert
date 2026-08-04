import React, { useState, useEffect, useRef } from 'react'
const API_URL = import.meta.env.VITE_API_URL || '';

export default function ProcessPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = React.useRef(null);
  const [inputFiles, setInputFiles] = useState([])
  const [outputFiles, setOutputFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [downloadFormat, setDownloadFormat] = useState('xls')
  const [processTab, setProcessTab] = useState('input')
  const [exportDate, setExportDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  })

  // Preview states
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSheet, setPreviewSheet] = useState('')
  const [previewSource, setPreviewSource] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, []);

  async function fetchFileList() {
    try {
      const [resIn, resOut] = await Promise.all([
        fetch(`${API_URL}/api/process/input-files`),
        fetch(`${API_URL}/api/process/output-files`)
      ])
      const dataIn = await resIn.json()
      const dataOut = await resOut.json()
      if (Array.isArray(dataIn)) setInputFiles(dataIn)
      if (Array.isArray(dataOut)) setOutputFiles(dataOut)
    } catch (err) {
      console.error('Error fetching file list:', err)
    }
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploadStatus(`Mengunggah ${files.length} file...`)

    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({ filename: file.name, contentBase64: reader.result })
        }
        reader.readAsDataURL(file)
      })
    })

    const fileData = await Promise.all(filePromises)

    try {
      const res = await fetch(`${API_URL}/api/process/upload-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileData })
      })
      const data = await res.json()
      if (res.ok) {
        setUploadStatus(`✓ Berhasil mengunggah ${files.length} file`)
        fetchFileList()
      } else {
        setUploadStatus('❌ Gagal: ' + (data.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      setUploadStatus('❌ Error: ' + err.message)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleProcess() {
    // Initialize progress
    setProgress(0)
    setLoading(true)
    setError('')
    setResult(null)
    // Simulate incremental progress while the backend processes
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + 10, 90) // cap at 90% until request finishes
        return next
      })
    }, 1000)
    try {
      const res = await fetch(`${API_URL}/api/process/run-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportDate })
      })
      const data = await res.json()
      setResult(data)
      fetchFileList()
    } catch (err) {
      setError(err.message)
    }
    // Ensure progress reaches 100% on completion
    setProgress(100)
    setLoading(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  async function handleDeleteInput(filename) {
    if (!window.confirm(`Yakin ingin menghapus ${filename}?\nData transaksi terkait file ini juga akan dihapus dari database.`)) return
    try {
      const res = await fetch(`${API_URL}/api/process/delete-input/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus file')
      const txCount = data.dbDeleted ? data.dbDeleted.transaksi : '?'
      const jCount = data.dbDeleted ? data.dbDeleted.jurnal : '?'
      console.log(`[DELETE] ${filename}: ${txCount} transaksi, ${jCount} jurnal dihapus dari DB`);
      // Refresh the input file list from backend to ensure UI reflects actual storage state
      await fetchFileList();
    } catch (err) {
      window.alert('Gagal menghapus file: ' + err.message)
    }
  }

  async function handleDeleteAllInput() {
    if (inputFiles.length === 0) return window.alert('Tidak ada file input untuk dihapus.')
    if (!window.confirm(`Yakin ingin menghapus SEMUA ${inputFiles.length} file input beserta seluruh data transaksinya? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      const res = await fetch(`${API_URL}/api/process/delete-all-input`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
      // Immediately clear UI — do NOT re-fetch (Supabase cache causes files to reappear)
      setInputFiles([])
      window.alert(data.message)
    } catch (err) {
      window.alert('Gagal menghapus semua file: ' + err.message)
    }
  }


  async function handleDownloadOutput(filename, format) {
    const endpoint = format === 'pdf'
      ? `${API_URL}/api/process/download-pdf/${encodeURIComponent(filename)}`
      : `${API_URL}/api/process/download/${encodeURIComponent(filename)}`
    
    const downloadName = format === 'pdf'
      ? filename.replace(/\.xlsx?$/i, '.pdf')
      : filename

    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const text = await res.text()
        window.alert('Gagal download: ' + text)
        return
      }
      const buffer = await res.arrayBuffer()
      const mimeType = format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const blob = new Blob([buffer], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert('Gagal download: ' + err.message)
    }
  }

  async function handlePreview(filename, source) {
    setPreviewLoading(true)
    setPreviewData(null)
    setPreviewSource(source)
    try {
      const res = await fetch(`${API_URL}/api/process/preview/${source}/${encodeURIComponent(filename)}?rows=100`)
      const data = await res.json()
      if (res.ok) {
        setPreviewData(data)
        setPreviewSheet(data.sheetNames[0] || '')
      } else {
        setPreviewData({ error: data.error })
      }
    } catch (err) {
      setPreviewData({ error: err.message })
    }
    setPreviewLoading(false)
  }

  function closePreview() {
    setPreviewData(null)
    setPreviewSheet('')
    setPreviewSource('')
  }

  const formatRupiah = (val) => {
    if (val === null || val === undefined || val === '') return ''
    if (typeof val === 'number') {
      return new Intl.NumberFormat('id-ID').format(val)
    }
    return String(val)
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Proses ETL</h1>
            <p className="page-subtitle">Pengolahan input → generate laporan output</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tanggal Cetak Laporan:</label>
              <input 
                type="date" 
                value={exportDate} 
                onChange={e => setExportDate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleProcess}
                disabled={loading || inputFiles.length === 0}
                style={{ minWidth: '160px' }}
              >
                {loading ? '⚙️ Memproses...' : '▶ Proses Sekarang'}
              </button>
              {loading && (
                <div style={{ width: '100%' }}>
                  <progress value={progress} max="100" style={{ width: '100%' }} />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{progress}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      <>
      {/* Pipeline Visualization */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pipeline</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem' }}>
            <div style={{ fontSize: '1.5rem' }}>📁</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem' }}>Input</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inputFiles.length} file</div>
          </div>
          <span style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>→</span>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem', background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <div style={{ fontSize: '1.5rem' }}>⚙️</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.25rem' }}>ETL</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--primary-dark)' }}>Parse → Jurnal</div>
          </div>
          <span style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>→</span>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem' }}>
            <div style={{ fontSize: '1.5rem' }}>📊</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem' }}>Output</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>5 Laporan</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Mobile Toggle for Input/Output */}
      <div className="process-toggle-group">
        <button
          className={`dash-toggle-btn${processTab === 'input' ? ' active' : ''}`}
          onClick={() => setProcessTab('input')}
        >
          📂 Input ({inputFiles.length})
        </button>
        <button
          className={`dash-toggle-btn${processTab === 'output' ? ' active' : ''}`}
          onClick={() => setProcessTab('output')}
        >
          📥 Output ({outputFiles.length})
        </button>
      </div>

      {/* Input & Output Files */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
        {/* Input Files */}
        <div className={`card process-card-input${processTab === 'input' ? ' process-card-active' : ''}`}>
          <div className="card-header">
            <h3 className="card-title">📂 Input ({inputFiles.length})</h3>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {inputFiles.length > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteAllInput}
                  title="Hapus semua file input dan data transaksinya"
                >
                  🗑️ Hapus Semua
                </button>
              )}
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                ➕ Upload
                <input 
                  type="file" 
                  accept=".xls,.xlsx" 
                  multiple 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>

          {uploadStatus && <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>{uploadStatus}</div>}

          {inputFiles.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="table-wrap process-desktop-table" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Nama File</th>
                      <th>Tgl Upload</th>
                      <th className="text-right">Ukuran</th>
                      <th className="text-center" style={{ width: '80px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputFiles.map((f, i) => (
                      <tr key={i}>
                        <td>📄 {f.filename}</td>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(f.modified).toLocaleDateString('id-ID')}</td>
                        <td className="text-right font-mono" style={{ fontSize: '0.8rem' }}>{(f.size / 1024).toFixed(1)} KB</td>
                        <td className="text-center" style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleDeleteInput(f.filename)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Hapus File"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="process-mobile-list">
                {inputFiles.map((f, i) => (
                  <div className="process-file-item" key={i}>
                    <div className="process-file-icon input">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="process-file-info">
                      <span className="process-file-name">{f.filename}</span>
                      <span className="process-file-meta">
                        {(f.size / 1024).toFixed(1)} KB · {new Date(f.modified).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="process-file-actions">
                      <button 
                        onClick={() => handleDeleteInput(f.filename)}
                        className="process-file-action-btn delete"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-text">Belum ada file input</div>
            </div>
          )}
        </div>

        {/* Output Files */}
        <div className={`card process-card-output${processTab === 'output' ? ' process-card-active' : ''}`}>
          <div className="card-header">
            <h3 className="card-title">📥 Output ({outputFiles.length} Laporan)</h3>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.2rem', borderRadius: '0.5rem' }}>
              <button
                onClick={() => setDownloadFormat('xls')}
                className={`btn btn-sm ${downloadFormat === 'xls' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                📊 XLS
              </button>
              <button
                onClick={() => setDownloadFormat('pdf')}
                className={`btn btn-sm ${downloadFormat === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                📄 PDF
              </button>
            </div>
          </div>

          {/* Desktop list */}
          <div className="process-desktop-table">
          {outputFiles.length > 0 ? outputFiles.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: i < outputFiles.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>📄 {item.filename}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {(item.size / 1024).toFixed(1)} KB · {new Date(item.modified).toLocaleDateString('id-ID')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => handlePreview(item.filename, 'output')}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Preview"
                >
                  👁️
                </button>
                <button
                  onClick={() => handleDownloadOutput(item.filename, downloadFormat)}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: '80px', textAlign: 'center' }}
                >
                  ⬇️ {downloadFormat.toUpperCase()}
                </button>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Belum ada output. Klik "Proses Sekarang"</div>
            </div>
          )}
          </div>

          {/* Mobile list */}
          <div className="process-mobile-list">
          {outputFiles.length > 0 ? outputFiles.map((item, i) => (
            <div className="process-file-item" key={i}>
              <div className="process-file-icon output">
                <span style={{ fontSize: '1.25rem' }}>📊</span>
              </div>
              <div className="process-file-info">
                <span className="process-file-name">{item.filename}</span>
                <span className="process-file-meta">
                  {(item.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="process-file-actions">
                <button
                  onClick={() => handlePreview(item.filename, 'output')}
                  className="process-file-action-btn"
                  title="Preview"
                  style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
                >
                  👁️
                </button>
                <button
                  onClick={() => handleDownloadOutput(item.filename, downloadFormat)}
                  className="process-file-action-btn download"
                  title={`Download ${downloadFormat.toUpperCase()}`}
                >
                  ⬇️
                </button>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Belum ada output</div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Execution Result */}
      {result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">✅ Hasil Eksekusi</h3>
            <span className={`status-pill ${result.reports?.every(r => r.status === 'OK') ? 'success' : 'warning'}`}>
              {result.reports?.filter(r => r.status === 'OK').length || 0} / {result.reports?.length || 0} Berhasil
            </span>
          </div>

          {result.reports?.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem' }}>{r.file}</div>
              <span className={`status-pill ${r.status === 'OK' ? 'success' : 'danger'}`}>
                {r.status === 'OK' ? '✓ OK' : '✕ Gagal'}
              </span>
            </div>
          ))}
        </div>
      )}
      </>



      {/* Excel Preview Modal */}
      {previewData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={closePreview}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
            width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  📋 Preview: {previewData.filename}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {previewData.totalSheets} sheet{previewData.totalSheets > 1 ? 's' : ''} · {previewSource === 'input' ? 'File Input' : 'File Output'}
                </span>
              </div>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>✕</button>
            </div>

            {/* Sheet Tabs */}
            {previewData.sheetNames && previewData.sheetNames.length > 1 && (
              <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.25rem', overflowX: 'auto', flexShrink: 0 }}>
                {previewData.sheetNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setPreviewSheet(name)}
                    style={{
                      padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)',
                      border: '1px solid', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap', transition: 'all 0.15s',
                      background: previewSheet === name ? 'var(--primary)' : 'var(--bg-surface)',
                      color: previewSheet === name ? 'white' : 'var(--text-secondary)',
                      borderColor: previewSheet === name ? 'var(--primary)' : 'var(--border)'
                    }}
                  >
                    {name}
                    {previewData.sheets[name] && (
                      <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>
                        ({previewData.sheets[name].totalRows}r)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Table Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1.25rem' }}>
              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <div className="loading-spinner"></div>
                  Memuat data...
                </div>
              ) : previewData.error ? (
                <div className="alert alert-danger">{previewData.error}</div>
              ) : previewData.sheets && previewSheet && previewData.sheets[previewSheet] ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-modern" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        {previewData.sheets[previewSheet].rows[0] && 
                          previewData.sheets[previewSheet].rows[0].map((_, ci) => (
                            <th key={ci} style={{ minWidth: '100px', textAlign: 'center' }}>
                              {String.fromCharCode(65 + ci)}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sheets[previewSheet].rows.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>
                            {ri + 1}
                          </td>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ 
                              maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontFamily: typeof cell === 'number' ? 'var(--font-mono)' : 'inherit',
                              textAlign: typeof cell === 'number' ? 'right' : 'left',
                              fontWeight: ri === 0 ? 600 : 400,
                              background: ri === 0 ? 'var(--primary-light)' : 'transparent'
                            }} title={cell !== null ? String(cell) : ''}>
                              {cell !== null ? (typeof cell === 'number' ? formatRupiah(cell) : String(cell)) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.sheets[previewSheet].hasMore && (
                    <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      ⚠️ Menampilkan 100 baris pertama dari {previewData.sheets[previewSheet].totalRows} total baris
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Pilih sheet untuk melihat data
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={closePreview} className="btn btn-secondary btn-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
