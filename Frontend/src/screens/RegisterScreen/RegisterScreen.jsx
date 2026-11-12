import React from 'react'
import './RegisterScreen.css'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { register } from '../../services/authService'
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
    <div className='register'>
      <div className='register-card'>
        <header className='register-header'>
          <div className='register-logo' aria-hidden='true'>R</div>
          <h1 className='register-title'>Registro de usuario</h1>
          <p className='register-subtitle'>Crea tu cuenta para empezar a colaborar</p>
        </header>
        <form className='register-form' onSubmit={handleSubmit}>
          <div className='register-field'>
            <label className='register-label' htmlFor="name">Nombre:</label>
            <input
              className='register-input'
              name='name'
              id='name'
              type='text'
              value={formState.name}
              onChange={handleChangeInput}
            />
          </div>
          <div className='register-field'>
            <label className='register-label' htmlFor="email">Email:</label>
            <input
              className='register-input'
              name='email'
              id='email'
              type='email'
              value={formState.email}
              onChange={handleChangeInput}
            />
          </div>
          <div className='register-field'>
            <label className='register-label' htmlFor="password">Password:</label>
            <input
              className='register-input'
              name='password'
              id='password'
              type='password'
              value={formState.password}
              onChange={handleChangeInput}
            />
          </div>
          {
            error
            &&
            !loading
            &&
            <span className='register-error'>{error}</span>
          }
          {
            loading
              ? <button className='register-btn' type='submit' disabled={true} >Cargando...</button>
              : <button className='register-btn' type='submit'>Registrarse</button>
          }
          {
            response && !loading && <span className='register-success'>Registro exitoso, revisa tu correo electronico para verificar la cuenta</span>
          }
        </form>
      </div>
    </div>
  )
}

export default RegisterScreen