








      v2.api
        AuthRequest
    		

        AuthResponse
    		

        SyncRequest
    		

        QueryRequest
CREATE TABLE query_request {
		CREATE COLUMN id ;
	
		CREATE COLUMN filter VARCHAR;
};
    		

        QueryResponse
CREATE TABLE query_response {
		CREATE COLUMN id ;
	
		CREATE COLUMN data VARCHAR;
};
    		

        MutationRequest
CREATE TABLE mutation_request {
		CREATE COLUMN id ;
	
		CREATE COLUMN payload VARCHAR;
};
    		

        MutationResponse
CREATE TABLE mutation_response {
		CREATE COLUMN id ;
	
		CREATE COLUMN payload VARCHAR;
};
    		

        AuthRequest
    		

        AuthResponse
    		

        SyncRequest
    		

        SyncResponse
DELETE TABLE sync_response;
    		


