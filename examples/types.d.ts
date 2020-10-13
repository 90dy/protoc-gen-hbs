
namespace api {
    class AuthRequest {
    }
    namespace AuthRequest {
      
    }
    class AuthResponse {
    }
    namespace AuthResponse {
      
    }
    class SyncRequest {
    }
    namespace SyncRequest {
      
    }
    class QueryRequest {
    }
    namespace QueryRequest {
      
    }
    class QueryResponse {
    }
    namespace QueryResponse {
      
    }
    class MutationRequest {
    }
    namespace MutationRequest {
      
    }
    class MutationResponse {
    }
    namespace MutationResponse {
      
    }
    class Service {
        async Auth(api.AuthRequest): api.AuthResponse
        async Sync(api.SyncRequest): api.SyncRequest
              async Query(api.QueryRequest): api.QueryResponse
        async Mutation(api.MutationRequest): api.MutationResponse
    }  
}
namespace example {
    class Void {
    }
    namespace Void {
      
    }
  
}
namespace examples {
    class Hello {
    }
    namespace Hello {
      
    }
    class HelloService {
        async World(examples.Hello): examples.Hello.World
        async There(examples.Hello): examples.Hello.There
    }  
}
