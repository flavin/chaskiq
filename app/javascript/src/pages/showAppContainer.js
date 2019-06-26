import React, {Component, createContext, Fragment} from 'react'
import actioncable from "actioncable"
import {
  Route,
  Link
} from 'react-router-dom'
import Moment from 'react-moment';
import PropTypes from 'prop-types';
import styled from 'styled-components';
//import Spinner from '@atlaskit/spinner';
//import EmptyState from '@atlaskit/empty-state'
//import UserMap from "../components/map"
import logo from '../images/logo.png';
import ConversationContainer from './ConversationContainer';
import CampaignContainer from './Campaigns'
import AppSettingsContainer from './AppSettings'
import {parseJwt, generateJWT} from '../components/segmentManager/jwt'

import ContentHeader from '../components/ContentHeader'
import Content from '../components/Content'
import AppContent from '../components/segmentManager/container'

import AtTabs from '../components/tabs'
import graphql from "../graphql/client"
import { APP, SEGMENT, APP_USER} from "../graphql/queries"
import { 
  PREDICATES_SEARCH, 
  PREDICATES_CREATE, 
  PREDICATES_UPDATE, 
  PREDICATES_DELETE 
} from '../graphql/mutations'

import Dashboard from './Dashboard'
import Drawer from '@material-ui/core/Drawer';
import Button from '@material-ui/core/Button'

import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { setApp } from '../actions/app'
import {
  fetchAppSegment, 
  updateSegment,
  createSegment,
  deleteSegment,
  addPredicate,
  updatePredicate,
  deletePredicate
} from '../actions/segments'

import {
  searchAppUsers,
  updateAppUserPresence
} from '../actions/app_users'

import {
  getAppUser 
} from '../actions/app_user'

import {
  updateConversationItem,
  appendConversation
} from '../actions/conversations'

import ProfileView from '../pages/ProfileView'

import {
  camelizeKeys
} from '../actions/conversation'

const CableApp = {
  cable: actioncable.createConsumer()
}
// Initialize a context
const Context = createContext()

// This context contains two interesting components
const { Provider, Consumer } = Context


class ShowAppContainer extends Component {

  constructor(props){
    super(props)
    this.state = {
      //app_users: [], 
      //segment: {},
      //meta: {},
      //searching: false,
      //jwt: null,
      currentUser: this.props.currentUser
    }
  }

  emptyprops = ()=> {
    return {
      header: `${this.props.app.name}`,
      description: this.props.app.description || 'no description',
      imageUrl: logo, //,
      primaryAction,
      //secondaryAction,
      //tertiaryAction,
    }
  }

  componentDidMount() {
    this.init()
  }

  componentDidUpdate(prevProps, prevState) {
    // only update chart if the data has changed
    if (prevProps.app && prevProps.app.key !== this.props.app.key){
      this.eventsSubscriber(this.props.app.key)
    }

    if(prevProps.match.url !== this.props.match.url){
      console.info("cambio match")
      this.init()
    }

    /*if (prevProps.segment.jwt !== this.props.segment.jwt) {
      console.info("cambio jwt")
      this.search()
    }*

    /*if (prevProps.segment.id !== this.props.segment.id) {
      console.info("cambio segmento")
      //this.fetchApp( ()=>{
        this.search()
      //})
    }*/
  }

  init = () => {
    this.fetchApp(() => {
      //this.search()
      this.eventsSubscriber(this.props.app.key)
    })
  }

  actions =()=>{
    return {
      fetchApp: this.fetchApp,
      eventsSubscriber: this.eventsSubscriber,
      fetchAppSegment: this.fetchAppSegment,
      getPredicates: this.getPredicates,
      updateSegment: this.updateSegment,
      updatePredicate: this.updatePredicate,
      savePredicates: this.savePredicates,
      addPredicate:   this.addPredicate,
      deletePredicate: this.deletePredicate,
      deleteSegment: this.deleteSegment,
      search: this.search,
      setAppUser: this.setAppUser
      //fetchAppSegments: this.fetchAppSegments
    }
  }

  fetchApp = (cb)=>{
    const id = this.props.match.params.appId
    this.props.dispatch(setApp(id, {
      success: ()=>{
        cb ? cb() : null 
      }
    }))
  }

  eventsSubscriber = (id)=>{
    // unsubscribe cable ust in case
    if(CableApp.events)
      CableApp.events.unsubscribe()

    CableApp.events = CableApp.cable.subscriptions.create({
      channel: "EventsChannel",
      app: id
    },
    {
        connected: ()=> {
          console.log("connected to events")
        },
        disconnected: ()=> {
          console.log("disconnected from events")
        },
        received: (data)=> {
          console.log(`received`, data)
          switch(data.type){
            case "conversation_part":
              return this.props.dispatch(appendConversation(camelizeKeys(data.data)))
            case "presence":
              return this.updateUser(camelizeKeys(data.data))
            default:
              return null
          }
          
        },
        notify: ()=>{
          console.log(`notify!!`)
        },
        handleMessage: (message)=>{
          console.log(`handle message`)
        } 
      });

    window.cable = CableApp
  }

  updateUser = (data)=>{
    console.log("REDUXIFY THIS!")

    this.props.dispatch(updateAppUserPresence(data))
    
    /*data = JSON.parse(data)
    this.setState({app_users: this.state.app_users.map( (el)=> 
        el.email === data.email ? Object.assign({}, el, data) : el 
      )
    });*/
  }

  setAppUser = (id)=>{
    this.props.dispatch(getAppUser(id))
  }

  search = (page)=>{
    const options = {
      page: page || 1,

    }

    this.props.dispatch(
      searchAppUsers(options, ()=>{
        
        // this.setState({
        //  segment: Object.assign({}, this.props.segment.segment, { predicates: jwtData })
        //})

      })
    )                      
  }

  fetchAppSegment =(id)=>{
    this.props.dispatch(
      fetchAppSegment(id, this.search )
    )
  }

  updateSegment = (data, cb)=>{
   this.props.dispatch(
     updateSegment(this.props.segment.id, cb)
   )
  }

  createSegment = (data, cb)=>{

    const params = {
      name: data.input,
      operation: "create",
    }

    this.props.dispatch(
      createSegment(params, () => {
        const url = `/apps/${this.props.app.key}/segments/${this.props.segment.id}.json`
        this.props.history.push(url)
        cb ? cb() : null
      })
    )
  }

  deleteSegment = (id, cb)=>{

    this.props.dispatch(deleteSegment(id, ()=>{

      cb ? cb() : null
      const url = `/apps/${this.props.app.key}`
      this.props.history.push(url)
      this.fetchApp()

    }))
  }

  addPredicate = (data, cb)=>{

    const pending_predicate = {
      attribute: data.name,
      comparison: null,
      type: data.type,
      value: data.value
    }
    this.props.dispatch(addPredicate(pending_predicate, (token)=>{
      //const url = `/apps/${this.props.app.key}/segments/${this.props.segment.id}?jwt`
      cb ? cb(token) : null
      //this.setState({jwt: token})
    }))

  }

  updatePredicate= (data, cb)=>{

    this.props.dispatch(updatePredicate(data, (token)=>{
      cb ? cb(token) : null
      //this.setState({jwt: token})
    }))
  }

  getPredicates= ()=>{
    return this.props.segment["predicates"] || []
  }

  savePredicates = (data, cb)=>{
    if(data.action === "update"){
      this.updateSegment(data, ()=> { 
        cb() 
        this.fetchApp() 
      })
    } else if(data.action === "new"){
      this.createSegment(data, ()=> { 
        cb() ; this.fetchApp() 
      })
    }
  }

  deletePredicate = (data)=>{

    this.props.dispatch(
      deletePredicate(data, 
        ()=> this.updateSegment({}, this.fetchApp()) 
      )
    )
  }

  render(){
    const {classes} = this.props

    if(!this.props.app)
      return <p>loading this mdfk</p>
   
    return <div>

                            {/*<Provider value={{
                              store: {
                                //app: this.props.app,
                                //app_users: this.props.segment.collection,
                                //meta: this.props.segment.meta,
                                //searching: this.props.segment.searching,
                                //segment: this.props.segment.segment,
                                currentUser: this.props.currentUser
                              }, 
                              actions: this.actions() 
                            }}>*/}

      {
        this.props.app && this.props.app.key ?
        <div>
          <Route exact path={`${this.props.match.path}/segments/:segmentID/:Jwt?`}
            render={(props) => {
              return <Content>
                        <AppContent 
                          //{...props}
                          match={props.match}
                          history={props.history}
                          //app={this.props.app}
                          //store={{currentUser: this.props.currentUser }}
                          actions={this.actions()}
                          //segment={this.props.segment}
                          //app_users={this.props.app_users}
                          //meta={this.props.app_users.meta}
                          //searching={this.props.app_users.searching}
                        />
                  
                    </Content>
            }} 
            />

          <Route exact path={`${this.props.match.path}/conversations/:id?`}
            render={(props) => (
                  <ConversationContainer
                    //app={this.props.app}
                    //currentUser={this.props.currentUser}
                    actions={this.actions()}
                    {...props}
                  />
            )} 
          />


          <Route path={`${this.props.match.path}/messages/:message_type`}
            render={(props) => (
                  <CampaignContainer
                    currentUser={this.props.current_user}
                    actions={this.actions()}
                    classes={props.classes}
                    {...props}
                  />
            )} />             

          <Route path={`${this.props.match.path}/settings`}
            render={(props) => (
              <AppSettingsContainer
                currentUser={this.props.current_user}
                store={store}
                actions={actions}
                {...props}
              />
            )}
          />

          <Route exact path={`${this.props.match.path}/users/:id`}
            render={(props) => (
              <ProfileView
                {...props}
              />
            )}
          />


          <Route exact path={`/apps/${this.props.app.key}`}
              render={() => (
                <Dashboard/>
            )} 
          />
          <Route exact path={`/apps/${this.props.app.key}/campaings`}
            render={() => (
              <p>
              empty !!
              {/*<EmptyState {...this.emptyprops()} />*/}
              </p>
              
            )}
          />
        </div> : null
      }
 
    </div>
  }
}

function mapStateToProps(state) {

  const { auth, app, segment, app_user, current_user } = state
  const { loading, isAuthenticated } = auth
  return {
    current_user,
    app_user,
    segment,
    app,
    loading,
    isAuthenticated
  }
}

//export default ShowAppContainer

export default withRouter(connect(mapStateToProps)(ShowAppContainer))


