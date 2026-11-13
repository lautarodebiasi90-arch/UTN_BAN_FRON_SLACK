import React from 'react'
import './Form.css'

/*
  Campo de formulario reutilizable (input + label opcional).

  Uso:
    <TextField
      name="email"
      label="Email:"            (opcional: sin label se ve como Slack)
      type="email"
      placeholder="nombre@work-email.com"
      value={formState.email}
      onChange={handleChangeInput}
      autoComplete="email"
    />
*/
function TextField({
  name,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  className = '',
  ...props
}) {
  return (
    <div className='form-field'>
      {
        label
        &&
        <label className='form-field__label' htmlFor={name}>
          {label}
        </label>
      }
      <input
        className={`form-field__input${className ? ` ${className}` : ''}`}
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        {...props}
      />
    </div>
  )
}

export default TextField