import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
import pick from 'lodash/pick'
import EventsTable from '../events/EventsTable'
import DashboardLayout from '../common/DashboardLayout'
import HttpDetails from './HttpDetails'
import PacketGraph from '../common/PacketGraph'
import { CHANNEL_FRAGMENT } from '../../graphql/channels'

// GraphQL
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

// MUI
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';

const queryOptions = {
  options: props => ({
    variables: {
      id: props.match.params.id
    }
  })
}

const query = gql`
  query ChannelShowQuery ($id: ID!) {
    channel(id: $id) {
      ...ChannelFragment
      method
      endpoint
      inbound_token
      devices {
        name
        team_id
      }
    }
  }
  ${CHANNEL_FRAGMENT}
`

@graphql(query, queryOptions)
@connect(mapStateToProps, null)
class ChannelShow extends Component {
  render() {
    const { loading, channel } = this.props.data

    if (loading) return <DashboardLayout />

    return(
      <DashboardLayout title={channel.name}>
        <Card>
          <CardContent>
            <Typography variant="headline" component="h3">
              Channel Details
            </Typography>

            <div style={{display: 'flex'}}>
              <div style={{width: '50%'}}>
                <Typography component="p">
                  ID: {channel.id}
                </Typography>
                <Typography component="p">
                  Name: {channel.name}
                </Typography>
                <Typography component="p">
                  Type: {channel.type_name}
                </Typography>
                <Typography component="p">
                  Active: {channel.active ? "Yes" : "No"}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>

        {channel.type === "http" && <HttpDetails channel={channel} />}

        <Card style={{marginTop: 24}}>
          <CardContent>
            <Typography variant="headline" component="h3">
              Devices Piped
            </Typography>
            {
              channel.devices.map(d => (
                <React.Fragment key={d.name}>
                  <Typography component="p">
                    {this.props.teams[d.team_id].name}: {d.name}
                  </Typography>
                </React.Fragment>
              ))
            }
            {
              channel.default && <Typography component="p">
                Default Channel for New Devices
              </Typography>
            }
            {
              !channel.default && channel.devices.length === 0 && <Typography component="p">
                0 Connected Devices
              </Typography>
            }
          </CardContent>
        </Card>
        {
          false && <Card style={{marginTop: 24}}>
            <CardContent>
              <Typography variant="headline" component="h3">
                Event Log
              </Typography>
              <EventsTable contextId={channel.id} contextName="channels"/>
            </CardContent>
          </Card>
        }

        {
          false && <Card style={{marginTop: 24}}>
            <CardContent>
              <Typography variant="headline" component="h3">
                Real Time Packets
              </Typography>
              <div className="chart-legend left">
                <div className="chart-legend-bulb red"></div>
                <Typography component="p">
                  Live Data
                </Typography>
              </div>
              <div className="chart-legend right">
                <div className="chart-legend-bulb blue"></div>
                <Typography component="p">
                  From Device
                </Typography>
                <div className="chart-legend-bulb green"></div>
                <Typography component="p">
                  To Device
                </Typography>
              </div>
              <PacketGraph contextId={channel.id} contextName="channels"/>
            </CardContent>
          </Card>
        }
      </DashboardLayout>
    )
  }
}

function mapStateToProps(state) {
  return {
    teams: state.entities.teams
  }
}

export default ChannelShow
