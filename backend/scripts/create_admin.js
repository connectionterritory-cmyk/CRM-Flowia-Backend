const bcrypt = require('bcrypt');
const db = require('../src/config/database');

console.log('🔐 Creating/updating admin user...\n');

const password = 'admin123';
const hashedPassword = bcrypt.hashSync(password, 10);

console.log('Generated hash:', hashedPassword);

// Delete existing admin if exists
db.prepare('DELETE FROM Usuarios WHERE Email = ?').run('admin@crm.com');

// Insert new admin
db.prepare(`
    INSERT INTO Usuarios (UsuarioID, Codigo, Nombre, Email, Password, Rol, Activo)
    VALUES (1, 'ADMIN', 'Administrador', 'admin@crm.com', ?, 'DISTRIBUIDOR', 1)
`).run(hashedPassword);

console.log('\n✅ Admin user created successfully!');
console.log('\n📝 Credentials:');
console.log('   Email: admin@crm.com');
console.log('   Password: admin123');
console.log('\n🔍 Verifying...');

const user = db.prepare('SELECT UsuarioID, Codigo, Email, Rol FROM Usuarios WHERE UsuarioID = 1').get();
console.log('   User found:', user);

const isValid = bcrypt.compareSync(password, hashedPassword);
console.log('   Password validation:', isValid ? '✅ Valid' : '❌ Invalid');
