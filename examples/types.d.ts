
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
namespace v1 {
  namespace super {
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
    class SyncResponse {
    }
    namespace SyncResponse {
      
    }
    class Service {
        async Auth(v1.super.api.AuthRequest): v1.super.api.AuthResponse
        async Sync(v1.super.api.SyncRequest): v1.super.api.SyncResponse
          }  
}

}

}
namespace v2 {
  namespace super {
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
        async Auth(v2.super.api.AuthRequest): v2.super.api.AuthResponse
        async Sync(v2.super.api.SyncRequest): v2.super.api.SyncRequest
              async Query(v2.super.api.QueryRequest): v2.super.api.QueryResponse
        async Mutation(v2.super.api.MutationRequest): v2.super.api.MutationResponse
    }  
}

}

}
