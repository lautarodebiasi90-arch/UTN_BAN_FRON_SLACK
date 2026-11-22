/*
Especificacion OpenAPI 3.0 de la API

Documenta:
    - El formato de ENTRADA de cada endpoint (params, body, headers)
    - TODAS las posibles SALIDAS (respuestas) de cada endpoint, incluyendo las que
      provienen de los middlewares (auth, workspace, conexion a MongoDB, manejador de errores)

Esta spec se sirve con Swagger UI desde /api/docs (ver main.js)
*/

const openapi_spec = {
    openapi: '3.0.3',
    info: {
        title: 'API Slack (UTN)',
        version: '1.0.0',
        description: `
API de un clon simplificado de Slack (usuarios, espacios de trabajo y miembros).

## Formato de respuesta general
Todas las respuestas (exitosas y de error controlado) usan un sobre (envelope) JSON con la forma:

\`\`\`json
{
    "ok": true | false,
    "status": 200,
    "message": "Descripcion del resultado",
    "data": { ... } // solo en respuestas que devuelven datos
}
\`\`\`

## Codigos de error comunes (transversales)
- **400** Datos faltantes o malformados (tambien headers de auth ausentes/malformados, ObjectIds invalidos o tokens de invitacion invalidos/expirados)
- **401** Token de autenticacion invalido, malformado o expirado
- **403** El usuario no es miembro del workspace o no tiene el rol necesario / email sin verificar
- **404** Recurso no encontrado en la base de datos
- **500** Error inesperado del servidor
- **503** No se pudo conectar a la base de datos MongoDB

## Sobre las respuestas de error
Los errores controlados (\`ServerError\`) responde con el **HTTP status real** (400, 401, 403, 404...) ademas de repetirlo
dentro del campo \`status\` del body. Los errores no controlados responden **500**.
`
    },

    servers: [
        {
            url: '/',
            description: 'Servidor actual (Swagger UI resuelve contra el mismo host donde corre la API)'
        }
    ],

    tags: [
        { name: 'Auth', description: 'Registro, login y verificacion de email' },
        { name: 'Users', description: 'Consulta de usuarios (NO requiere autenticacion)' },
        { name: 'Workspaces', description: 'Espacios de trabajo y membresias (requiere autenticacion)' }
    ],

    //Esquema de seguridad: Authorization: Bearer <auth_token>
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Header `Authorization: Bearer <auth_token>` obtenido de POST /api/auth/login'
            }
        },

        parameters: {
            user_id: {
                name: 'user_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB del usuario',
                schema: { type: 'string', example: '6aabff9a190ff6061955c889' }
            },
            workspace_id: {
                name: 'workspace_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB del espacio de trabajo',
                schema: { type: 'string', example: '6aabff9a190ff6061955c888' }
            },
            member_id: {
                name: 'member_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB de la membresia (no del usuario)',
                schema: { type: 'string', example: '6aabff9a190ff6061955c887' }
            },
            verify_email_token: {
                name: 'verify_email_token',
                in: 'path',
                required: true,
                description: 'JWT de verificacion enviado por email al registrarse (expira en 7 dias)',
                schema: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
            },
            invitation_token: {
                name: 'invitation_token',
                in: 'path',
                required: true,
                description: 'Token de invitacion recibido por email',
                schema: { type: 'string', example: 'b3f1c9e2-8a4d-4c3b-9f2a-1d5e7f8a9b0c' }
            }
        },

        schemas: {
            /*
            Envelope de ERROR controlado (ServerError -> error.middleware.js)
            Responde con el HTTP status real del error y lo repite en el body
            */
            ApiError: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: false },
                    status: {
                        type: 'integer',
                        description: 'Codigo de estado logico del error (400, 401, 403, 404, 500...)',
                        example: 400
                    },
                    message: { type: 'string', example: 'Email is required' }
                },
                required: ['ok', 'status', 'message']
            },

            /*
            Sobre de respuesta HTTP 503: no se pudo conectar a MongoDB (middleware de main.js)
            */
            DbConnectionError: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'No se pudo conectar a la base de datos' }
                },
                required: ['message']
            },

            //Documento "Usuario" tal como lo devuelve la API (sin el hash de password)
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '6aabff9a190ff6061955c889' },
                    nombre: { type: 'string', example: 'maria' },
                    email: { type: 'string', format: 'email', example: 'maria@mail.com' },
                    fecha_creacion: { type: 'string', format: 'date-time', example: '2026-09-17T14:56:26.249Z' },
                    activo: { type: 'boolean', example: true },
                    email_verificado: { type: 'boolean', example: false },
                    __v: { type: 'integer', example: 0 }
                },
                required: ['_id', 'nombre', 'email', 'fecha_creacion', 'activo', 'email_verificado'],
                description: 'El hash de la password se excluye de todas las respuestas por seguridad'
            },

            //Documento "EspacioTrabajo" tal como lo devuelve Mongoose
            Workspace: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '6aabff9a190ff6061955c888' },
                    nombre: { type: 'string', example: 'Equipo UTN', maxLength: 30 },
                    description: { type: 'string', example: 'Espacio de trabajo de la comision', maxLength: 200 },
                    fecha_creacion: { type: 'string', format: 'date-time', example: '2026-11-17T14:00:00.000Z' },
                    __v: { type: 'integer', example: 0 }
                },
                required: ['_id', 'nombre', 'fecha_creacion']
            },

            //Documento "Miembro" tal como lo devuelve Mongoose
            Member: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '6aabff9a190ff6061955c887' },
                    fk_id_usuario: { type: 'string', example: '6aabff9a190ff6061955c889' },
                    fk_id_espacio_trabajo: { type: 'string', example: '6aabff9a190ff6061955c888' },
                    rol: { type: 'string', enum: ['user', 'admin', 'owner'], example: 'owner' },
                    fecha_creacion: { type: 'string', format: 'date-time', example: '2026-11-17T14:00:00.000Z' },
                    activo: { type: 'boolean', example: false },
                    __v: { type: 'integer', example: 0 }
                },
                required: ['_id', 'fk_id_usuario', 'fk_id_espacio_trabajo', 'rol', 'fecha_creacion', 'activo']
            },

            //Formato de membresia + workspace devuelto por GET /api/workspaces
            WorkspaceMembershipSummary: {
                type: 'object',
                properties: {
                    member_id: { type: 'string', example: '6aabff9a190ff6061955c887' },
                    member_role: { type: 'string', enum: ['user', 'admin', 'owner'], example: 'owner' },
                    workspace_id: { type: 'string', example: '6aabff9a190ff6061955c888' },
                    workspace_name: { type: 'string', example: 'Equipo UTN' },
                    workspace_fecha_creacion: { type: 'string', format: 'date-time', example: '2026-11-17T14:00:00.000Z' }
                },
                required: ['member_id', 'member_role', 'workspace_id', 'workspace_name', 'workspace_fecha_creacion']
            },

            // data de POST /api/auth/login
            LoginData: {
                type: 'object',
                properties: {
                    auth_token: {
                        type: 'string',
                        description: 'JWT firmado (HS256) que debe enviarse en el header Authorization',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2...'
                    }
                },
                required: ['auth_token']
            }
        },

        //Respuestas de error reutilizables que aplican a TODOS los endpoints con auth
        responses: {
            //Del middleware de conexion a MongoDB (main.js)
            ServiceUnavailable: {
                description: '503 - No se pudo conectar a la base de datos MongoDB',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/DbConnectionError' }
                    }
                }
            },
            //Del error.middleware.js ante errores no controlados (incluye ObjectId invalido)
            InternalError: {
                description: '500 - Error inesperado del servidor',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiError' },
                        example: { ok: false, status: 500, message: 'Internal server error' }
                    }
                }
            }
        }
    },

    paths: {
        /* ============================================================
        AUTH
        ============================================================ */

        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Registrar un nuevo usuario',
                description: `
Crea un usuario en la base de datos y le envia un email con un link de verificacion.
El password se guarda hasheado (bcrypt) y nunca se devuelve.

**Entrada (body JSON):** \`username\`, \`email\`, \`password\` (todos requeridos; solo se valida presencia y formato de email, no el tipo).
                `,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'maria' },
                                    email: { type: 'string', format: 'email', example: 'maria@mail.com' },
                                    password: { type: 'string', example: 'pepe123' }
                                },
                                required: ['username', 'email', 'password']
                            },
                            example: {
                                username: 'maria',
                                email: 'maria@mail.com',
                                password: 'pepe123'
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Usuario registrado correctamente (y email de verificacion enviado)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        status: { type: 'integer', example: 201 },
                                        message: { type: 'string', example: 'User registered successfully' }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Email, password and username is required\` (falta alguno de los 3 campos)
- \`Email is incorrect\` (formato de email invalido)
- \`Email is already used\` (el email ya esta registrado)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    campos_faltantes: { value: { ok: false, status: 400, message: 'Email, password and username is required' } },
                                    email_invalido: { value: { ok: false, status: 400, message: 'Email is incorrect' } },
                                    email_repetido: { value: { ok: false, status: 400, message: 'Email is already used' } }
                                }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Iniciar sesion',
                description: `
Valida credenciales y devuelve un JWT (\`auth_token\`) para usar como
\`Authorization: Bearer <auth_token>\` en los endpoints protegidos.

**Entrada (body JSON):** \`email\` y \`password\` (strings requeridos).

**Orden de validaciones:** campos -> formato de email -> existencia de usuario (401) -> password correcta (401) -> email verificado (403).
                `,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email', example: 'maria@mail.com' },
                                    password: { type: 'string', example: 'pepe123' }
                                },
                                required: ['email', 'password']
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Login exitoso, devuelve el token de sesion',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'You have logged in successfully' },
                                        status: { type: 'integer', example: 200 },
                                        data: { $ref: '#/components/schemas/LoginData' }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Email and password are required\` (faltan campos o no son strings)
- \`Email is incorrect\` (formato de email invalido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    campos_faltantes: { value: { ok: false, status: 400, message: 'Email and password are required' } },
                                    email_invalido: { value: { ok: false, status: 400, message: 'Email is incorrect' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'Credenciales invalidas (mensaje identical para usuario inexistente y password incorrecta)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Invalid email or password' }
                            }
                        }
                    },
                    403: {
                        description: 'La cuenta existe y las credenciales son validas, pero el email no fue verificado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 403, message: 'Email no verificado' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/auth/verify-email/{verify_email_token}': {
            get: {
                tags: ['Auth'],
                summary: 'Verificar el email de un usuario',
                description: `
Endpoint al que llega el usuario haciendo click en el link del email de verificacion.
No requiere body. Marca \`email_verificado: true\` para el usuario asociado al token.

**Entrada (path param):** \`verify_email_token\` = JWT emitido en el registro (expira en 7 dias).
                `,
                parameters: [{ $ref: '#/components/parameters/verify_email_token' }],
                responses: {
                    200: {
                        description: 'Email verificado exitosamente',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        status: { type: 'integer', example: 200 },
                                        message: { type: 'string', example: 'Usuario verificado exitosamente' }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: 'El usuario ya estaba verificado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 400, message: 'Ya estas verificado' }
                            }
                        }
                    },
                    403: {
                        description: 'El usuario esta desactivado de la plataforma',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 403, message: 'Usuario esta desactivado de la plataforma, contactate con soporte si consideras que esto es un error' }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un usuario con el email embebido en el token',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Usuario no encontrado' }
                            }
                        }
                    },
                    500: {
                        description: `Error inesperado, incluye los casos:
- Token malformado o con firma invalida (jwt.verify lanza \`JsonWebTokenError\`)
- Token expirado (\`TokenExpiredError\`, pasaron los 7 dias)
- Otro error no controlado`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 500, message: 'Internal server error' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        /* ============================================================
        USERS (sin autenticacion)
        ============================================================ */

        '/api/users': {
            get: {
                tags: ['Users'],
                summary: 'Obtener la lista de todos los usuarios',
                description: `
Devuelve todos los usuarios registrados. **No requiere autenticacion.**

⚠️ **Entrada:** no tiene (no acepta query params ni body).
El hash de la password de cada usuario **no** se incluye en la respuesta.
                `,
                responses: {
                    200: {
                        description: 'Lista de usuarios obtenida correctamente',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Get users list' },
                                        ok: { type: 'boolean', example: true },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                users: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/User' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/users/{user_id}': {
            get: {
                tags: ['Users'],
                summary: 'Obtener un usuario por su id',
                description: `
Devuelve los datos completos de un usuario. **No requiere autenticacion.**

**Entrada (path param):** \`user_id\` = ObjectId de MongoDB (se valida el formato; si es invalido la respuesta es **400**).
                `,
                parameters: [{ $ref: '#/components/parameters/user_id' }],
                responses: {
                    200: {
                        description: 'Usuario encontrado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Get user details successfully' },
                                        status: { type: 'integer', example: 200 },
                                        ok: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: { $ref: '#/components/schemas/User' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Invalid user id\` (el user_id no es un ObjectId de MongoDB valido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 400, message: 'Invalid user id' }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un usuario con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'User not found' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        /* ============================================================
        WORKSPACES
        ============================================================ */

        '/api/workspaces': {
            post: {
                tags: ['Workspaces'],
                summary: 'Crear un espacio de trabajo',
                description: `
Crea un espacio de trabajo y la membresia \`owner\` del usuario autenticado.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\` (validado por \`authMiddleware\`)
- **Body JSON:** \`name\` y \`description\` (⚠️ el codigo NO valida que vengan, se guardan tal cual)

⚠️ Nota: la membresia \`owner\` se crea con \`activo: false\` (valor por defecto del modelo Member).
                `,
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Equipo UTN', maxLength: 30 },
                                    description: { type: 'string', example: 'Espacio de trabajo de la comision', maxLength: 200 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Workspace creado junto con la membresia owner del usuario autenticado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        status: { type: 'integer', example: 201 },
                                        message: { type: 'string', example: 'Por ahora todo bien' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                workspace_created: { $ref: '#/components/schemas/Workspace' },
                                                owner_membership: { $ref: '#/components/schemas/Member' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Header de autorizacion ausente o malformado (authMiddleware):
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_header: { value: { ok: false, status: 400, message: 'Auth header is requered' } },
                                    header_malformado: { value: { ok: false, status: 400, message: 'Auth header is malformed' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'El auth_token es invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            },

            get: {
                tags: ['Workspaces'],
                summary: 'Obtener los espacios de trabajo del usuario autenticado',
                description: `
Devuelve la lista de espacios de trabajo asociados al usuario (a traves de sus membresias), con formato:

\`\`\`json
{
    "member_id": "...",
    "member_role": "owner",
    "workspace_id": "...",
    "workspace_name": "...",
    "workspace_fecha_creacion": "..."
}
\`\`\`

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- No tiene body
                `,
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Espacios de trabajo obtenidos correctamente (contrato previsto)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Espacios de trabajo obtenidos correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                workspaces: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/WorkspaceMembershipSummary' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: 'Header de autorizacion ausente (`Auth header is requered`) o malformado (`Auth header is malformed`)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/workspaces/{workspace_id}': {
            get: {
                tags: ['Workspaces'],
                summary: 'Obtener los datos de un espacio de trabajo',
                description: `
Devuelve el workspace solicitado, siempre que el usuario autenticado sea miembro (cualquier rol).

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path param:** \`workspace_id\` (se valida el formato; si es invalido la respuesta es **400**)
- Sin body
                `,
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/workspace_id' }],
                responses: {
                    200: {
                        description: 'Workspace obtenido correctamente (el usuario es miembro)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Workspace obtenido correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                workspace_selected: { $ref: '#/components/schemas/Workspace' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")
- \`Workspace id invalido\` (el workspace_id no es un ObjectId de MongoDB valido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_header: { value: { ok: false, status: 400, message: 'Auth header is requered' } },
                                    header_malformado: { value: { ok: false, status: 400, message: 'Auth header is malformed' } },
                                    id_invalido: { value: { ok: false, status: 400, message: 'Workspace id invalido' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: 'El usuario autenticado no tiene una membresia en este workspace',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 403, message: 'No eres miembro de este espacio de trabajo' }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            },

            put: {
                tags: ['Workspaces'],
                summary: 'Actualizar nombre y/o descripcion de un espacio de trabajo',
                description: `
Actualiza el workspace. Requiere ser **owner o admin** del mismo.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path param:** \`workspace_id\`
- **Body JSON:** \`name\` y/o \`description\` (⚠️ no hay validacion de tipos ni de longitud en el codigo; la longitud maxima del modelo es nombre: 30, description: 200)

⚠️ Nota: la respuesta devuelve el documento **ya actualizado** (\`findByIdAndUpdate\` con \`new: true\`).
                `,
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/workspace_id' }],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Equipo UTN 2.0', maxLength: 30 },
                                    description: { type: 'string', example: 'Nueva descripcion', maxLength: 200 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Workspace actualizado correctamente',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Workspace actualizado correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                workspace_updated: { $ref: '#/components/schemas/Workspace' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")
- \`Workspace id invalido\` (el workspace_id no es un ObjectId de MongoDB valido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 400, message: 'Workspace id invalido' }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: `Posibles mensajes:
- \`No eres miembro de este espacio de trabajo\` (sin membresia)
- \`No tienes permisos suficientes para hacer esta operacion\` (rol distinto de owner/admin)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_membresia: { value: { ok: false, status: 403, message: 'No eres miembro de este espacio de trabajo' } },
                                    sin_permisos: { value: { ok: false, status: 403, message: 'No tienes permisos suficientes para hacer esta operacion' } }
                                }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: {
                        description: `Error inesperado, incluye:
- Validacion de Mongoose fallida (por ejemplo nombre con mas de 30 caracteres)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 500, message: 'Internal server error' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            },

            delete: {
                tags: ['Workspaces'],
                summary: 'Eliminar un espacio de trabajo',
                description: `
Elimina el workspace y **todas** sus membresias. Requiere ser **owner**.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path param:** \`workspace_id\`
- Sin body
                `,
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/workspace_id' }],
                responses: {
                    200: {
                        description: 'Workspace eliminado correctamente (devuelve el documento eliminado)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Workspace eliminado correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                workspace_deleted: { $ref: '#/components/schemas/Workspace' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")
- \`Workspace id invalido\` (el workspace_id no es un ObjectId de MongoDB valido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 400, message: 'Workspace id invalido' }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: `Posibles mensajes:
- \`No eres miembro de este espacio de trabajo\` (sin membresia)
- \`No tienes permisos suficientes para hacer esta operacion\` (solo el owner puede eliminar)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_membresia: { value: { ok: false, status: 403, message: 'No eres miembro de este espacio de trabajo' } },
                                    sin_permisos: { value: { ok: false, status: 403, message: 'No tienes permisos suficientes para hacer esta operacion' } }
                                }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: {
                        description: 'Error inesperado del servidor',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 500, message: 'Internal server error' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/workspaces/{workspace_id}/members': {
            get: {
                tags: ['Workspaces'],
                summary: 'Obtener los miembros de un espacio de trabajo',
                description: `
Devuelve la lista de membresias del workspace (cualquier rol puede consultar), con los datos del usuario poblados.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path param:** \`workspace_id\`
- Sin body
                `,
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/workspace_id' }],
                responses: {
                    200: {
                        description: 'Miembros obtenidos correctamente (contrato previsto, hoy no se ejecuta)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Miembros obtenidos correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                members: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/Member' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")
- \`Workspace id invalido\` (el workspace_id no es un ObjectId de MongoDB valido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 400, message: 'Workspace id invalido' }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: 'Sin membresia en el workspace o rol no permitido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_membresia: { value: { ok: false, status: 403, message: 'No eres miembro de este espacio de trabajo' } },
                                    sin_permisos: { value: { ok: false, status: 403, message: 'No tienes permisos suficientes para hacer esta operacion' } }
                                }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/workspaces/{workspace_id}/members/{member_id}': {
            delete: {
                tags: ['Workspaces'],
                summary: 'Eliminar un miembro del espacio de trabajo',
                description: `
Elimina una membresia del workspace. Requiere ser **owner o admin**.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path params:** \`workspace_id\`, \`member_id\` (id de la MEMBRESIA, no del usuario)
- Sin body

⚠️ La respuesta devuelve la membresia eliminada (\`data.member_deleted\`).
                `,
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/workspace_id' },
                    { $ref: '#/components/parameters/member_id' }
                ],
                responses: {
                    200: {
                        description: 'Miembro eliminado correctamente (devuelve la membresia eliminada)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Miembro eliminado correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                member_deleted: { $ref: '#/components/schemas/Member' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` (no se envio el header Authorization)
- \`Auth header is malformed\` (el header no contiene un token despues de "Bearer ")
- \`Workspace id invalido\` / \`Member id invalido\` (ObjectId de MongoDB invalido)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    sin_header: { value: { ok: false, status: 400, message: 'Auth header is requered' } },
                                    header_malformado: { value: { ok: false, status: 400, message: 'Auth header is malformed' } },
                                    id_invalido: { value: { ok: false, status: 400, message: 'Member id invalido' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: `Posibles mensajes:
- \`No eres miembro de este espacio de trabajo\` (sin membresia)
- \`No tienes permisos suficientes para hacer esta operacion\` (rol distinto de owner/admin)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: {
                        description: 'Error inesperado del servidor',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 500, message: 'Internal server error' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/workspaces/{workspace_id}/members/invite': {
            post: {
                tags: ['Workspaces'],
                summary: 'Invitar un usuario al espacio de trabajo',
                description: `
Crea una membresia para el usuario indicado y le envia un email con un link de aceptacion de invitacion (vence en 7 dias). Requiere ser **owner o admin**.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\`
- **Path param:** \`workspace_id\`
- **Body JSON:** \`email\` (email del usuario ya registrado a invitar) y \`role\` (\`admin\` o \`user\`; si no se envia, se invita como \`user\`)

⚠️ La membresia se crea con \`activo: false\` hasta que el invitado acepte via accept-invite.
                `,
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/workspace_id' }],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email', example: 'nuevo@mail.com' },
                                    role: { type: 'string', enum: ['admin', 'user'], example: 'user' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Miembro invitado correctamente (se crea la membresia inactiva y se envia el email)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Miembro invitado correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                member_invited: { $ref: '#/components/schemas/Member' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` / \`Auth header is malformed\` (header Authorization ausente o malformado)
- \`Workspace id invalido\` (ObjectId invalido)
- \`Email is required\` (no se envio el email a invitar)
- \`Rol invalido: solo se puede invitar con rol admin o user\`
- \`El usuario ya es miembro de este espacio de trabajo\``,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    id_invalido: { value: { ok: false, status: 400, message: 'Workspace id invalido' } },
                                    email_requerido: { value: { ok: false, status: 400, message: 'Email is required' } },
                                    rol_invalido: { value: { ok: false, status: 400, message: 'Rol invalido: solo se puede invitar con rol admin o user' } },
                                    ya_miembro: { value: { ok: false, status: 400, message: 'El usuario ya es miembro de este espacio de trabajo' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: 'Sin membresia en el workspace o rol distinto de owner/admin',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' }
                            }
                        }
                    },
                    404: {
                        description: `Posibles mensajes:
- \`Workspace no encontrado\` (no existe un workspace con ese id)
- \`Usuario no encontrado\` (ningun usuario registrado con el email indicado)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    workspace_inexistente: { value: { ok: false, status: 404, message: 'Workspace no encontrado' } },
                                    usuario_inexistente: { value: { ok: false, status: 404, message: 'Usuario no encontrado' } }
                                }
                            }
                        }
                    },
                    500: {
                        description: 'Error inesperado del servidor (por ejemplo fallo al enviar el email de invitacion)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 500, message: 'Internal server error' }
                            }
                        }
                    },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        },

        '/api/workspaces/{workspace_id}/members/accept-invite/{invitation_token}': {
            get: {
                tags: ['Workspaces'],
                summary: 'Aceptar una invitacion al espacio de trabajo',
                description: `
Marca la membresia como invitacion aceptada (\`activo: true\`) para el token recibido.

**Entrada:**
- **Header:** \`Authorization: Bearer <auth_token>\` (el usuario invitado debe estar autenticado y tener su membresia, creada por el invite)
- **Path params:** \`workspace_id\`, \`invitation_token\`
- Sin body

⚠️ El \`invitation_token\` es un JWT (firma + expiracion de 7 dias) recibido por email.
                `,
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/workspace_id' },
                    { $ref: '#/components/parameters/invitation_token' }
                ],
                responses: {
                    200: {
                        description: 'Invitacion aceptada correctamente (devuelve la membresia actualizada con activo: true)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Invitación aceptada correctamente' },
                                        status: { type: 'integer', example: 200 },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                member_accepted: { $ref: '#/components/schemas/Member' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: {
                        description: `Datos invalidos. Posibles mensajes:
- \`Auth header is requered\` / \`Auth header is malformed\` (header Authorization ausente o malformado)
- \`Workspace id invalido\` (ObjectId invalido)
- \`Invitacion invalida o expirada\` (token malformado, firma invalida, expirado o de otro workspace)
- \`Ya aceptaste esta invitacion\` (la membresia ya estaba activa)`,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                examples: {
                                    id_invalido: { value: { ok: false, status: 400, message: 'Workspace id invalido' } },
                                    invitacion_invalida: { value: { ok: false, status: 400, message: 'Invitacion invalida o expirada' } },
                                    ya_aceptada: { value: { ok: false, status: 400, message: 'Ya aceptaste esta invitacion' } }
                                }
                            }
                        }
                    },
                    401: {
                        description: 'Token invalido, malformado o expirado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 401, message: 'Auth token is invalid!' }
                            }
                        }
                    },
                    403: {
                        description: 'El usuario autenticado no tiene membresia en este workspace',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 403, message: 'No eres miembro de este espacio de trabajo' }
                            }
                        }
                    },
                    404: {
                        description: 'No existe un workspace con ese id',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiError' },
                                example: { ok: false, status: 404, message: 'Workspace no encontrado' }
                            }
                        }
                    },
                    500: { $ref: '#/components/responses/InternalError' },
                    503: { $ref: '#/components/responses/ServiceUnavailable' }
                }
            }
        }
    }
}

export default openapi_spec
