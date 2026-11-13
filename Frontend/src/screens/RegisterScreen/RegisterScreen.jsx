import React from 'react'
import { Link } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { register } from '../../services/authService'
import TextField from '../../Components/Form/TextField'
import FormButton from '../../Components/Form/FormButton'
import Alert from '../../Components/Alert/Alert'

function RegisterScreen() {
  const initial_state = { name: '', email: '', password: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => register(formState.name, formState.email, formState.password)
    )
    console.log('Usuario intenta registrarse', formState)
  }

  return (
    <div className='form-screen'>
      <div className='form-card form-card--register'>
        <img
          className='form-logo'
          alt='Slack'
          height='26'
          title='Slack'
          src='https://a.slack-edge.com/bv1-13/slack_logo-97f7334.svg'
        />
        <h1 className='form-title'>Primero, escribe tu correo</h1>
        <p className='form-subtitle'>
          Te sugerimos que uses <strong>la dirección de correo electrónico que usas en el trabajo</strong>.
        </p>
        <form className='form-stack' onSubmit={handleSubmit}>
          <TextField
            name='name'
            type='text'
            placeholder='Nombre y apellido'
            className='form-field__input--pill'
            value={formState.name}
            onChange={handleChangeInput}
            autoComplete='name'
            autoFocus
          />
          <TextField
            name='email'
            type='email'
            placeholder='nombre@work-email.com'
            className='form-field__input--pill'
            value={formState.email}
            onChange={handleChangeInput}
            autoComplete='email'
          />
          <TextField
            name='password'
            type='password'
            placeholder='Contraseña'
            className='form-field__input--pill'
            value={formState.password}
            onChange={handleChangeInput}
            autoComplete='new-password'
          />
          {
            error
            &&
            !loading
            &&
            <Alert type='error'>{error}</Alert>
          }
          <FormButton className='form-btn--violet' loading={loading} loadingText='Registrando…'>
            Registrarse
          </FormButton>
          {
            response
            &&
            !loading
            &&
            <Alert type='success'>
              Registro exitoso, revisa tu correo electronico para verificar la
              cuenta
            </Alert>
          }
          <div className='form-divider'>
            <span className='form-divider__line' aria-hidden='true'></span>
            <span className='form-divider__text'>OTRAS OPCIONES</span>
            <span className='form-divider__line' aria-hidden='true'></span>
          </div>
          <div className='social-buttons'>
            <button type='button' className='social-button'>
              <svg className='social-button__icon' width='18' height='18' viewBox='0 0 48 48' aria-hidden='true'>
                <path fill='#FFC107' d='M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z'/>
                <path fill='#FF3D00' d='M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'/>
                <path fill='#4CAF50' d='M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z'/>
                <path fill='#1976D2' d='M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.7-.4-3.9z'/>
              </svg>
              Google
            </button>
            <button type='button' className='social-button'>
              <svg className='social-button__icon' width='15' height='18' viewBox='0 0 384 512' aria-hidden='true'>
                <path fill='currentColor' d='M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z'/>
              </svg>
              Apple
            </button>
          </div>
        </form>
        <div className='already-using'>
          <p className='already-using__text'>¿Ya estás usando Slack?</p>
          <Link to='/login' className='already-using__link'>
            Iniciar sesión en un espacio de trabajo existente
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterScreen
