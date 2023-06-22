import { ChatGPTUnofficialProxyAPI, ChatGPTAPI  } from 'chatgpt'
import { getAccessToken } from './access_token.js'

const chatGPT = {
    init: false,
    sendMessage: null,
}

async function methodProxyAPI() {
    const api = new ChatGPTUnofficialProxyAPI ({
        accessToken: await getAccessToken(),
        apiReverseProxyUrl: process.env.API_REVERSE_PROXY_SERVER
    })

   return api
}

async function methodTokenAPI() {
    const api = new ChatGPTAPI({
        apiKey: process.env.OPENAI_TOKEN_KEY
    }) 
    return api
}

export async function initChatGPT() {
    let api
    console.log(process.env.MODE_OPENAI_AUTH)
    if(process.env.MODE_OPENAI_AUTH === "token") {
        api = await methodTokenAPI()
    }
    else {
        api = await methodProxyAPI()
    }
    chatGPT.sendMessage = async (message, opts = {}) => {
        let result = await api.sendMessage(message, {
            ...opts
        })

        result.parentMessageId = result.id
        return result
    }

    chatGPT.init = true

    setTimeout(initChatGPT,1000*60*60*8) // reinir after 8 hours
}

export async function askQuestion(question, cb, opts = {}) {

    if (!chatGPT.init) {
        cb("Chatgpt not initialized!")
        return;
    }

    const { conversationInfo } = opts

    let tmr = setTimeout(() => {
        cb("Oppss, something went wrong! (Timeout)")
    }, 120000)

    if (process.env.CONVERSATION_START_PROMPT.toLowerCase() != "false" && conversationInfo.newConversation) {
        question = process.env.CONVERSATION_START_PROMPT + "\n\n" + question
    }

    try{
        const response = await chatGPT.sendMessage(question, {
            conversationId: conversationInfo.conversationId,
            parentMessageId: conversationInfo.parentMessageId
        })
        conversationInfo.conversationId = response.conversationId
        conversationInfo.parentMessageId = response.parentMessageId
        cb(response.text)
    }catch(e){
        cb("Oppss, something went wrong! (Error)")
        console.error("dm error : " + e)
    }finally{
        clearTimeout(tmr)
    }
}