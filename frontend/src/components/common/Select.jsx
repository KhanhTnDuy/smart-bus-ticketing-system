import React from 'react';
import { AlertCircle } from 'lucide-react';

export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  helperText = '',
  className = '',
  id,
  ...props
}) => {
  const selectId = id || name || Math.random().toString(36).substring(7);

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`form-select ${error ? 'has-error' : ''}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <span className="form-error">
          <AlertCircle size={13} />
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
