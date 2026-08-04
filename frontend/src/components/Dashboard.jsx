import React, { useEffect, useState } from 'react'
import { getNeracaSaldo, getLabaRugi, getTransaksi } from '../api'

export default function Dashboard({ setPage }) {
  const [saldo, setSaldo] = useState([])
  const [labaRugi, setLabaRugi] = useState(null)
  const [transaksi, setTransaksi] = useState([])
  const [date, setDate] = useState('')
  const [periodeStart, setPeriodeStart] = useState('')
  const [activeTab, setActiveTab] = useState('ringkasan')
  const [flowTab, setFlowTab] = useState('pendapatan')

  useEffect(() => {
    const now = new Date()
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
    setDate(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`)
    setPeriodeStart(`1 ${months[now.getMonth()]} ${now.getFullYear()}`)
    getNeracaSaldo().then(setSaldo).catch(() => {})
    getLabaRugi().then(setLabaRugi).catch(() => {})
    getTransaksi().then(t => setTransaksi(t.slice(0, 5))).catch(() => {})
  }, [])

  const totalKas = saldo.filter(s => s.kode?.startsWith('10') || s.kode?.startsWith('11')).reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalAset = saldo.filter(s => s.tipe === 'aset').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalKewajiban = saldo.filter(s => s.tipe === 'kewajiban').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalEkuitas = saldo.filter(s => s.tipe === 'ekuitas').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)

  const pendapatan = labaRugi?.totalPendapatan || 0
  const beban = labaRugi?.totalBeban || 0
  const labaBersih = labaRugi?.labaBersih || 0
  const profitMargin = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(1) : 0

  // Breakdown items for pendapatan/beban detail
  const pendapatanItems = labaRugi?.pendapatan || []
  const bebanItems = labaRugi?.beban || []

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)
  }

  const selisih = pendapatan - beban
  const maxBar = Math.max(pendapatan, beban, 1)

  // Percentage calculations for breakdown
  const getPercentage = (amount, total) => {
    if (!total || total === 0) return 0
    return ((Math.abs(amount) / Math.abs(total)) * 100).toFixed(1)
  }

  return (
    <div className="page dash-page">
      {/* ========== GREETING HEADER ========== */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <div className="dash-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div className="dash-greeting-name">Halo, Admin!</div>
            <div className="dash-greeting-sub">PDAM Seruyan</div>
          </div>
        </div>
        <div className="dash-shortcuts">
          <button className="dash-shortcut-btn" title="Bukti Transaksi" onClick={() => setPage && setPage('transaksi')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ========== PILL TAB NAVIGATION ========== */}
      <div className="dash-tabs">
        <button
          className={`dash-tab${activeTab === 'ringkasan' ? ' active' : ''}`}
          onClick={() => setActiveTab('ringkasan')}
        >
          Ringkasan
        </button>
        <button
          className={`dash-tab${activeTab === 'transaksi' ? ' active' : ''}`}
          onClick={() => setActiveTab('transaksi')}
        >
          Transaksi
        </button>
        <button
          className={`dash-tab${activeTab === 'laporan' ? ' active' : ''}`}
          onClick={() => setActiveTab('laporan')}
        >
          Laporan
        </button>
      </div>

      {/* ========== TAB: RINGKASAN ========== */}
      {activeTab === 'ringkasan' && (
        <div className="dash-tab-content">
          {/* Balance Card */}
          <div className="dash-balance-card">
            <div className="dash-balance-pattern"></div>
            <div className="dash-balance-inner">
              <div className="dash-balance-top">
                <div className="dash-balance-icon" style={{ background: '#fff', padding: '2px', borderRadius: '50%' }}>
                  <img src="/logo-pdam.png" alt="Logo PDAM" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }} />
                </div>
                <div className="dash-balance-info">
                  <span className="dash-balance-label">PDAM TIRTA SERUYAN</span>
                  <span className="dash-balance-acct">Kas & Bank Operasional</span>
                </div>
              </div>
              <div className="dash-balance-main">
                <span className="dash-balance-prefix">Saldo efektif</span>
                <span className="dash-balance-amount">Rp{formatRupiah(totalKas)}</span>
              </div>
            </div>
          </div>

          {/* Rekap Keuangan */}
          <div className="dash-recap">
            <div className="dash-recap-header">
              <div>
                <h3 className="dash-recap-title">
                  Rekap Keuangan
                  <span className="dash-recap-info" title="Ringkasan pendapatan dan beban">ⓘ</span>
                </h3>
                <p className="dash-recap-period">Periode {periodeStart} - {date}</p>
              </div>
              <button className="dash-recap-link" onClick={() => setPage && setPage('laba-rugi')}>
                Selengkapnya
              </button>
            </div>

            <div className="dash-recap-card">
              <div className="dash-recap-dropdown">
                <span>Semua akun kas & bank</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>

              {/* Summary amounts */}
              <div className="dash-recap-amounts">
                <div className="dash-recap-amount-col">
                  <span className="dash-recap-dot green"></span>
                  <span className="dash-recap-amount-label">Pendapatan</span>
                  <span className="dash-recap-amount-value">Rp{formatRupiah(pendapatan)}</span>
                </div>
                <div className="dash-recap-divider"></div>
                <div className="dash-recap-amount-col">
                  <span className="dash-recap-dot red"></span>
                  <span className="dash-recap-amount-label">Beban</span>
                  <span className="dash-recap-amount-value">Rp{formatRupiah(beban)}</span>
                </div>
              </div>

              {/* Selisih */}
              <div className={`dash-recap-selisih ${selisih >= 0 ? 'positive' : 'negative'}`}>
                Selisih {selisih < 0 ? '-' : '+'}Rp{formatRupiah(Math.abs(selisih))}
              </div>

              {/* Bar Chart */}
              <div className="dash-recap-bars">
                <div className="dash-recap-bar-wrapper">
                  <div
                    className="dash-recap-bar income"
                    style={{ height: `${Math.max(20, (pendapatan / maxBar) * 100)}%` }}
                  >
                    <span className="dash-recap-bar-value">Rp{formatRupiah(pendapatan)}</span>
                  </div>
                  <span className="dash-recap-bar-label">Pendapatan</span>
                </div>
                <div className="dash-recap-bar-wrapper">
                  <div
                    className="dash-recap-bar expense"
                    style={{ height: `${Math.max(20, (beban / maxBar) * 100)}%` }}
                  >
                    <span className="dash-recap-bar-value">Rp{formatRupiah(beban)}</span>
                  </div>
                  <span className="dash-recap-bar-label">Beban</span>
                </div>
              </div>

              {/* Toggle Pendapatan / Beban */}
              <div className="dash-toggle-group">
                <button
                  className={`dash-toggle-btn${flowTab === 'pendapatan' ? ' active' : ''}`}
                  onClick={() => setFlowTab('pendapatan')}
                >
                  Pendapatan
                </button>
                <button
                  className={`dash-toggle-btn${flowTab === 'beban' ? ' active' : ''}`}
                  onClick={() => setFlowTab('beban')}
                >
                  Beban
                </button>
              </div>

              {/* Breakdown */}
              <div className="dash-breakdown">
                {flowTab === 'pendapatan' ? (
                  pendapatanItems.length > 0 ? (
                    pendapatanItems.map((item, i) => (
                      <div className="dash-breakdown-item" key={i}>
                        <div className="dash-breakdown-icon income">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        </div>
                        <div className="dash-breakdown-info">
                          <span className="dash-breakdown-name">{item.nama || 'Pendapatan'}</span>
                          <span className="dash-breakdown-amount">Rp{formatRupiah(Math.abs(item.saldo || 0))}</span>
                        </div>
                        <div className="dash-breakdown-right">
                          <span className="dash-breakdown-pct">{getPercentage(item.saldo, pendapatan)}%</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dash-breakdown-item">
                      <div className="dash-breakdown-icon income">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                      </div>
                      <div className="dash-breakdown-info">
                        <span className="dash-breakdown-name">Uang Masuk</span>
                        <span className="dash-breakdown-amount">Rp{formatRupiah(pendapatan)}</span>
                      </div>
                      <div className="dash-breakdown-right">
                        <span className="dash-breakdown-pct">100%</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  )
                ) : (
                  bebanItems.length > 0 ? (
                    bebanItems.map((item, i) => (
                      <div className="dash-breakdown-item" key={i}>
                        <div className="dash-breakdown-icon expense">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                        </div>
                        <div className="dash-breakdown-info">
                          <span className="dash-breakdown-name">{item.nama || 'Beban'}</span>
                          <span className="dash-breakdown-amount">Rp{formatRupiah(Math.abs(item.saldo || 0))}</span>
                        </div>
                        <div className="dash-breakdown-right">
                          <span className="dash-breakdown-pct">{getPercentage(item.saldo, beban)}%</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dash-breakdown-item">
                      <div className="dash-breakdown-icon expense">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                      </div>
                      <div className="dash-breakdown-info">
                        <span className="dash-breakdown-name">Uang Keluar</span>
                        <span className="dash-breakdown-amount">Rp{formatRupiah(beban)}</span>
                      </div>
                      <div className="dash-breakdown-right">
                        <span className="dash-breakdown-pct">100%</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dash-section">
            <h3 className="dash-section-title">Fitur Pilihan</h3>
            <div className="dash-actions-grid">
              <button className="dash-action-btn" onClick={() => setPage && setPage('transaksi')}>
                <div className="dash-action-icon blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <span className="dash-action-label">Transaksi</span>
              </button>
              <button className="dash-action-btn" onClick={() => setPage && setPage('laba-rugi')}>
                <div className="dash-action-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <span className="dash-action-label">Laba Rugi</span>
              </button>
              <button className="dash-action-btn" onClick={() => setPage && setPage('neraca')}>
                <div className="dash-action-icon purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                </div>
                <span className="dash-action-label">Neraca</span>
              </button>
              <button className="dash-action-btn" onClick={() => setPage && setPage('process')}>
                <div className="dash-action-icon amber">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <span className="dash-action-label">Proses Data</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="dash-section">
            <h3 className="dash-section-title">Posisi Keuangan</h3>
            <div className="dash-metric-grid">
              <div className="dash-metric-card">
                <div className="dash-metric-icon blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <div className="dash-metric-info">
                  <span className="dash-metric-label">Total Aset</span>
                  <span className="dash-metric-value">Rp{formatRupiah(totalAset)}</span>
                </div>
              </div>
              <div className="dash-metric-card">
                <div className="dash-metric-icon red">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="dash-metric-info">
                  <span className="dash-metric-label">Kewajiban</span>
                  <span className="dash-metric-value">Rp{formatRupiah(totalKewajiban)}</span>
                </div>
              </div>
              <div className="dash-metric-card">
                <div className="dash-metric-icon green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <div className="dash-metric-info">
                  <span className="dash-metric-label">Ekuitas</span>
                  <span className="dash-metric-value">Rp{formatRupiah(totalEkuitas)}</span>
                </div>
              </div>
              <div className="dash-metric-card">
                <div className={`dash-metric-icon ${labaBersih >= 0 ? 'green' : 'red'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <div className="dash-metric-info">
                  <span className="dash-metric-label">Margin Laba</span>
                  <span className={`dash-metric-value ${labaBersih >= 0 ? 'success' : 'danger'}`}>{profitMargin}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: TRANSAKSI ========== */}
      {activeTab === 'transaksi' && (
        <div className="dash-tab-content">
          <div className="dash-section">
            <div className="dash-section-header">
              <h3 className="dash-section-title">Transaksi Terbaru</h3>
              <button className="dash-recap-link" onClick={() => setPage && setPage('transaksi')}>
                Lihat Semua
              </button>
            </div>

            {transaksi.length > 0 ? (
              <div className="dash-tx-list">
                {transaksi.map(t => {
                  const totalDebit = t.jurnal?.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0) || 0
                  const totalKredit = t.jurnal?.reduce((s, j) => s + (parseFloat(j.kredit) || 0), 0) || 0
                  const isIncome = totalKredit > totalDebit
                  return (
                    <div className="dash-tx-item" key={t.id}>
                      <div className={`dash-tx-icon ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                        )}
                      </div>
                      <div className="dash-tx-info">
                        <span className="dash-tx-desc">{t.deskripsi}</span>
                        <span className="dash-tx-date">{t.tanggal}</span>
                      </div>
                      <div className={`dash-tx-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : '-'}Rp{formatRupiah(Math.max(totalDebit, totalKredit))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">Belum ada transaksi</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== TAB: LAPORAN ========== */}
      {activeTab === 'laporan' && (
        <div className="dash-tab-content">
          <div className="dash-section">
            <h3 className="dash-section-title">Akses Cepat Laporan</h3>
            <div className="dash-report-grid">
              <button className="dash-report-card" onClick={() => setPage && setPage('laba-rugi')}>
                <div className="dash-report-icon green">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <span className="dash-report-label">Laporan Laba Rugi</span>
                <span className="dash-report-sub">Pendapatan vs Beban</span>
              </button>
              <button className="dash-report-card" onClick={() => setPage && setPage('neraca')}>
                <div className="dash-report-icon blue">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                </div>
                <span className="dash-report-label">Neraca</span>
                <span className="dash-report-sub">Posisi Keuangan</span>
              </button>
            </div>

            {/* Quick Financial Summary */}
            <div className="dash-report-summary">
              <h4 className="dash-report-summary-title">Ikhtisar Keuangan</h4>
              <div className="dash-report-rows">
                <div className="dash-report-row">
                  <span className="dash-report-row-label">Total Pendapatan</span>
                  <span className="dash-report-row-value success">Rp{formatRupiah(pendapatan)}</span>
                </div>
                <div className="dash-report-row">
                  <span className="dash-report-row-label">Total Beban</span>
                  <span className="dash-report-row-value danger">Rp{formatRupiah(beban)}</span>
                </div>
                <div className="dash-report-row highlight">
                  <span className="dash-report-row-label">Laba/Rugi Bersih</span>
                  <span className={`dash-report-row-value ${labaBersih >= 0 ? 'success' : 'danger'}`}>
                    {labaBersih < 0 ? '-' : ''}Rp{formatRupiah(Math.abs(labaBersih))}
                  </span>
                </div>
                <div className="dash-report-row">
                  <span className="dash-report-row-label">Total Aset</span>
                  <span className="dash-report-row-value">Rp{formatRupiah(totalAset)}</span>
                </div>
                <div className="dash-report-row">
                  <span className="dash-report-row-label">Total Kewajiban</span>
                  <span className="dash-report-row-value">Rp{formatRupiah(totalKewajiban)}</span>
                </div>
                <div className="dash-report-row">
                  <span className="dash-report-row-label">Total Ekuitas</span>
                  <span className="dash-report-row-value">Rp{formatRupiah(totalEkuitas)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
