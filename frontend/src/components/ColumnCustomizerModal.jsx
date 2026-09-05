import React from 'react';

export const ALL_COLUMNS = [
  { id: 'sNo',           label: 'S.No.',                default: true  },
  { id: 'company',       label: 'Company Name',         default: true  },
  { id: 'symbol',        label: 'Symbol',               default: true  },
  { id: 'price',         label: 'CMP (₹)',              default: true  },
  { id: 'pe',            label: 'P/E',                  default: true  },
  { id: 'marketCap',     label: 'Mar Cap (₹ Cr)',       default: true  },
  { id: 'divYield',      label: 'Div Yld %',            default: true  },
  { id: 'npQtr',         label: 'NP Qtr (₹ Cr)',        default: true  },
  { id: 'qtrProfitVar',  label: 'Qtr Profit Var %',     default: true  },
  { id: 'salesQtr',      label: 'Sales Qtr (₹ Cr)',      default: true  },
  { id: 'qtrSalesVar',   label: 'Qtr Sales Var %',      default: true  },
  { id: 'roce',          label: 'ROCE %',               default: true  },
  { id: 'changePercent', label: 'Daily % Change',       default: true  },
  { id: 'change2D',      label: '2D Move % (since 2 Sep)', default: true },
  { id: 'dayHigh',       label: 'Day High (₹)',         default: false },
  { id: 'dayLow',        label: 'Day Low (₹)',          default: false },
  { id: 'exchange',      label: 'Exchange',             default: false },
  { id: 'attention',     label: 'Attention Level',      default: false },
];

export default function ColumnCustomizerModal({ isOpen, onClose, visibleColumns, onToggleColumn, onResetDefault }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content column-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">⚙️ Customize Table Columns</h3>
            <p className="modal-sub">Select which Screener columns to display or hide in your watchlist table.</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="column-options-grid">
          {ALL_COLUMNS.map(col => {
            const isChecked = visibleColumns.includes(col.id);
            return (
              <label key={col.id} className="column-checkbox-card">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleColumn(col.id)}
                />
                <span className="column-checkbox-label">{col.label}</span>
              </label>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn btn--ghost btn--sm" onClick={onResetDefault}>
            Reset to Default
          </button>
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
