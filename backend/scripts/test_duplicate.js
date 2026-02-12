const axios = require('axios');

async function testDuplicate() {
    try {
        console.log('Testing Duplicate Contact Creation...');

        // 1. Create lead with same phone as previous test
        // Previous was: Name: "Nuevo Cliente Test", Phone: "+507 6000-0000"

        const payload = {
            nombre: "Dup Phone Test User", // Different name
            telefono: "+507 6000-0000",    // Same phone
            origenId: 1,
            etapa: "NUEVO_LEAD",
            productoInteres: "Duplicate Check"
        };

        const response = await axios.post('http://localhost:3001/api/oportunidades/crear-con-contacto', payload);

        console.log('Response:', response.data);

        if (response.data.clienteNuevo === false) {
            console.log('SUCCESS: System detected existing client!');
            console.log(`Opportunity created for existing client: ${response.data.oportunidad.ContactoNombre}`);
            // Note: ContactoNombre might be the OLD name ("Nuevo Cliente Test") or new one? 
            // My backend logic uses the ID of found client but DOES NOT update the name. 
            // So it should show "Nuevo Cliente Test" (or whatever the first one was) attached to this new opp.
        } else {
            console.error('FAILURE: System created a NEW client instead of reusing.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testDuplicate();
