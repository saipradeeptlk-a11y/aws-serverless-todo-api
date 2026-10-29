import {getIdToken,signOut} from "../auth/cognito"
const API_URL = import.meta.env.VITE_API_URL;

export async function authFetch(path,options){
    
    const token = await getIdToken();
   
    if(!token){
        throw new Error("user not logged in")
    }
    
    const res = await fetch(path,{
        method:options?.method ?? "GET",
        headers:{...(options?.headers??{}),Authorization:token},
        body:options?.body ?? undefined
    })

    if(res.status === 401){
        signOut();
        throw new Error("Session expired");

    }
    
    return res;

   


}
export async function getTasks() {

  try{

  const res = await authFetch(`${API_URL}/tasks`);

  if(!res.ok){
    throw new Error("Failed to load tasks")
  }
  
  return await res.json();
}catch(err){
    console.log(err);
    throw  err;
}
}

export async function createTasks(title,status){
    try{
        const res = await authFetch(`${API_URL}/tasks`,{
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(
                  {title, status}
            )

        });

        if(!res.ok){
            throw new Error("Failed to create tasks")
        }
        
        return await res.json();

    }
    catch(err){
        console.log(err);
        throw err
    }
}

export async function deleteTasks(id){
    try{
        const res = await authFetch(`${API_URL}/tasks/${id}`,{
            method: "DELETE",
            

        });

        if(!res.ok){
            throw new Error("Failed to delete tasks")
        }
        
        return await res.json();

    }
    catch(err){
        console.log(err);
        throw err
    }
}
export async function updateTasks(status,id){
    try{
        const res = await authFetch(`${API_URL}/tasks/${id}`,{
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ status })

        });

        if(!res.ok){
            throw new Error("Failed to update the status")
        }
        
        return await res.json();

    }
    catch(err){
        console.log(err);
        throw err
    }
}