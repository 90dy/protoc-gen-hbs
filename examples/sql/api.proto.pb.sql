



CREATE TABLE _auth_request {
		CREATE COLUMN name VARCHAR;
	
		CREATE COLUMN password VARCHAR;
};

	


CREATE TABLE _auth_response {
		CREATE COLUMN code INTEGER;
	
		CREATE COLUMN token VARCHAR;
};

	


CREATE TABLE _sync_request {
		CREATE COLUMN operation INTEGER;
	
		CREATE COLUMN payload VARBINARY;
};

	
