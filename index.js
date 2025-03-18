const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// * Private App Access Token (NO INCLUIR en repositorios públicos)
const PRIVATE_APP_ACCESS = '';

// * Nombre del objeto personalizado en HubSpot
const CUSTOM_OBJECT_NAME = '2-42115507';

// * Configuración de headers para la API
const headers = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    'Content-Type': 'application/json'
};
 
// * FUNCTION - Buscar un registro en HubSpot por su ID personalizado
async function findPetById(id) {
    try {
        const searchUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_NAME}/search`;

        const requestBody = {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: "id",
                            operator: "EQ",
                            value: id
                        }
                    ]
                }
            ],
            properties: ["id", "hs_object_id"]
        };

        console.log(`🔍 Buscando ID en HubSpot: ${id}`);

        const response = await axios.post(searchUrl, requestBody, { headers });

        console.log(`📌 Respuesta de HubSpot en búsqueda:`, JSON.stringify(response.data, null, 2));

        if (response.data.total > 0) {
            console.log(`✅ Registro encontrado:`, response.data.results[0]);
            return response.data.results[0]; // Devuelve el primer objeto encontrado
        }

        console.log(`⚠️ No se encontró un registro con ID: ${id}`);
        return null;
    } catch (error) {
        console.error('❌ Error buscando el ID:', error.response?.data || error.message);
        return null;
    }
}

// * ROUTE 1 - Página principal con todos los registros
app.get('/', async (req, res) => {
    const customObjectsUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_NAME}?properties=id,name,animal_species,breed,pet_owner,hs_object_id`;

    try {
        const response = await axios.get(customObjectsUrl, { headers });
        const customObjects = response.data.results || [];

        console.log("📌 Registros obtenidos desde HubSpot:", customObjects);

        res.render('homepage', {
            title: 'Pet Records | HubSpot API',
            customObjects
        });
    } catch (error) {
        console.error('❌ Error obteniendo registros:', error.response?.data || error.message);
        res.status(500).send('Error retrieving pet records');
    }
});

// * ROUTE 2 - Formulario para agregar o editar un registro
app.get('/update-cobj', (req, res) => {
    res.render('updates', {
        title: 'Add a New Pet Record | HubSpot Integration',
        pet: null
    });
});

// * ROUTE 3 - Crear o actualizar un registro en HubSpot
app.post('/update-cobj', async (req, res) => {
    const { id, name, animal_species, breed, pet_owner } = req.body;

    if (!id) {
        console.error("❌ Error: 'id' es requerido.");
        return res.status(400).send("❌ Error: 'id' es requerido.");
    }

    try {
        const existingPet = await findPetById(id);

        if (existingPet && existingPet.id) {
            // ✅ **Si el ID ya existe, obtenemos `hs_object_id` y actualizamos**
            const hs_object_id = existingPet.id;

            const updateObjectData = {
                properties: {
                    name,
                    animal_species,
                    breed,
                    pet_owner
                }
            };

            const updateObjectUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_NAME}/${hs_object_id}`;

            console.log(`🔄 Intentando actualizar registro con hs_object_id: ${hs_object_id}`);

            const updateResponse = await axios.patch(updateObjectUrl, updateObjectData, { headers });

            console.log(`✅ Registro actualizado correctamente:`, updateResponse.data);
        } else {
            // ✅ **Si el ID no existe, se crea un nuevo registro**
            const newObjectData = {
                properties: {
                    id,
                    name,
                    animal_species,
                    breed,
                    pet_owner
                }
            };

            const createObjectUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_NAME}`;
            const createResponse = await axios.post(createObjectUrl, newObjectData, { headers });

            console.log(`✅ Nuevo registro creado con ID: ${id}`, createResponse.data);
        }

        res.redirect('/');
    } catch (error) {
        console.error('❌ Error procesando el registro:', error.response?.data || error.message);
        res.status(500).send('Error procesando el registro.');
    }
});

// * ROUTE 4 - Obtener un registro específico por ID personalizado antes de editar
app.get('/update-cobj/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pet = await findPetById(id);

        if (!pet) {
            return res.status(404).send("❌ No se encontró el registro.");
        }

        res.render('updates', {
            title: 'Edit Pet Record | HubSpot Integration',
            pet
        });
    } catch (error) {
        console.error('❌ Error obteniendo registro:', error.response?.data || error.message);
        res.status(500).send('Error retrieving pet record.');
    }
});


// * Localhost
app.listen(3000, () => console.log('🚀 Servidor corriendo en http://localhost:3000'));
