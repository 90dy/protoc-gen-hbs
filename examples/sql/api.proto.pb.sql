



CREATE TABLE api_auth_request {
		CREATE COLUMN name VARCHAR;
	
		CREATE COLUMN password VARCHAR;
};

		


CREATE TABLE api_auth_response {
		CREATE COLUMN code INTEGER;
	
		CREATE COLUMN token VARCHAR;
};

		


CREATE TABLE api_sync_request {
		CREATE COLUMN operation INTEGER;
	
		CREATE COLUMN payload VARBINARY;
};

		
