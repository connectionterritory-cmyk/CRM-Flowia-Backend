CREATE TABLE IF NOT EXISTS TelemarketingAsignaciones (
    TelemarketingUserID INTEGER NOT NULL,
    SellerUserID INTEGER NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TelemarketingUserID, SellerUserID),
    FOREIGN KEY (TelemarketingUserID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE,
    FOREIGN KEY (SellerUserID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tm_assignments_telemarketing ON TelemarketingAsignaciones(TelemarketingUserID);
CREATE INDEX IF NOT EXISTS idx_tm_assignments_seller ON TelemarketingAsignaciones(SellerUserID);
