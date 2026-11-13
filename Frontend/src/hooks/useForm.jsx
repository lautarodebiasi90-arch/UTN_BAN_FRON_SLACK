import { useState } from "react"

function useForm (initial_state ){

    const [formState, setFormState] = useState(initial_state)

    function handleChangeInput (event){
        const input = event.target
        const field_name = input.name
        const field_value = input.value

        setFormState(
            (prevState) => {
                return {...prevState, [field_name]: field_value}
            }
        )
    }

    /*
    Permite setear un campo por codigo (sin evento),
    util para precargar valores guardados (ej: email recordado).
    */
    function setFieldValue (field_name, field_value){
        setFormState(
            (prevState) => {
                return {...prevState, [field_name]: field_value}
            }
        )
    }

    return {
        formState,
        handleChangeInput,
        setFieldValue
    }
}

export default useForm

