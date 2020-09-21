import React, { Component } from 'react'
import { formatUnixDatetime, getDiffInSeconds } from '../../util/time'
import uniqBy from 'lodash/uniqBy';
import groupBy from 'lodash/groupBy';
import PacketGraph from '../common/PacketGraph'
import { DEVICE_EVENTS, EVENTS_SUBSCRIPTION } from '../../graphql/events'
import { graphql } from 'react-apollo';
import { Badge, Card, Col, Row, Typography, Table, Tag, Popover } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, CheckOutlined, InfoOutlined, CloseOutlined } from '@ant-design/icons';
const { Text } = Typography

const queryOptions = {
  options: props => ({
    variables: {
      device_id: props.device_id,
    },
    fetchPolicy: 'network-only',
  })
}

const styles = {
  tag: {
    borderRadius: 9999,
    paddingBottom: 0,
    paddingRight: 9,
    fontSize: 14
  }
}

//https://stackoverflow.com/questions/39460182/decode-base64-to-hexadecimal-string-with-javascript
const base64ToHex = str => {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result.toUpperCase();
}

const categoryTag = (category) => {
  switch(category) {
    case "up":
      return <Text>Uplink</Text>
    case "down":
      return <Text>Downlink</Text>
    case "ack":
      return <Text>Acknowledge</Text>
    case "activation":
      return <Text>Activation</Text>
    case "packet_dropped":
      return <Text>Packet Dropped</Text>
    case "channel_crash":
      return <Text>Channel Crashed</Text>
    case "channel_start_error":
      return <Text>Channel Start Error</Text>
  }
}

const statusBadge = (status) => {
  switch(status) {
    case "error":
      return <Badge status="error" />
    case "success":
      return <Badge status="success" />
    default:
      return <Badge status="default" />
  }
}

@graphql(DEVICE_EVENTS, queryOptions)
class EventsDashboard extends Component {
  state = {
    rows: []
  }

  componentDidUpdate(prevProps) {
    const { deviceEvents, loading, subscribeToMore, variables } = this.props.data

    if (prevProps.data.loading && !loading) {
      this.setState({ rows: deviceEvents }, () => {
        subscribeToMore({
          document: EVENTS_SUBSCRIPTION,
          variables,
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev

            this.addEvent(subscriptionData.data.eventAdded)
          }
        })
      })
    }
  }

  addEvent = event => {
    const { rows } = this.state
    const lastEvent = rows[rows.length - 1]
    if (rows.length > 100 && getDiffInSeconds(parseInt(lastEvent.reported_at)) > 300) {
      rows.pop()
    }
    this.setState({
      rows: [event].concat(rows)
    })
  }

  renderExpanded = record => {
    let hotspotColumns
    if (record.category == 'ack' || record.category == 'down') {
      hotspotColumns = [
        { title: 'Hotspot Name', dataIndex: 'name' },
        { title: 'Frequency', dataIndex: 'frequency', render: data => <span>{(Math.round(data * 100) / 100).toFixed(2)}</span> },
        { title: 'Spreading', dataIndex: 'spreading' },
      ]
    } else {
      hotspotColumns = [
        { title: 'Hotspot Name', dataIndex: 'name' },
        { title: 'RSSI', dataIndex: 'rssi'},
        { title: 'SNR', dataIndex: 'snr', render: data => <span>{(Math.round(data * 100) / 100).toFixed(2)}</span> },
        { title: 'Frequency', dataIndex: 'frequency', render: data => <span>{(Math.round(data * 100) / 100).toFixed(2)}</span> },
        { title: 'Spreading', dataIndex: 'spreading' },
      ]
    }

    const channelColumns = [
      { title: 'Integration Name', dataIndex: 'name' },
      { title: 'Message', render: (data, record) => <Text>{statusBadge(record.status)}{record.description}</Text> }
    ]

    return (
      <Row gutter={10}>
        <Col span={22}>
          <Card  bodyStyle={{padding: 0}}>
            <Table columns={hotspotColumns} dataSource={record.hotspots} pagination={false} rowKey={record => record.id}/>
          </Card>
          <Card  bodyStyle={{padding: 0}}>
            <Table columns={channelColumns} dataSource={record.channels} pagination={false} rowKey={record => record.id}/>
          </Card>
        </Col>
      </Row>
    )
  }

  renderFrameIcons = row => {
    switch(row.category) {
      case "up":
        return (
          <Tag style={styles.tag} color="#4091F7">
            <CaretUpOutlined style={{ marginRight: 1 }}/>
            {row.frame_up}
          </Tag>
        )
      case "down":
        return (
          <Tag style={styles.tag} color="#FA541C">
            <CaretDownOutlined style={{ marginRight: 1 }}/>
            {row.frame_down}
          </Tag>
        )
      case "ack":
        return (
          <Tag style={styles.tag} color="#A0D911">
            <CheckOutlined style={{ fontSize: 12, marginRight: 3 }} />
            {row.frame_up}
          </Tag>
        )
      case "activation":
        return (
          <Tag style={styles.tag} color="#4091F7">
            <CheckOutlined style={{ fontSize: 12, marginRight: 3 }} />
            {row.frame_up}
          </Tag>
        )
      case "packet_dropped":
        return (
          <span>
            <Tag style={styles.tag} color="#D9D9D9">
              <CloseOutlined style={{ fontSize: 16, marginRight: 3, position: 'relative', top: 1.5 }} />
              {row.frame_up}
            </Tag>
            <Popover
              content={row.description}
              placement="top"
              overlayStyle={{ width: 220 }}
            >
              <Tag style={{ ...styles.tag, paddingRight: 0, cursor: "pointer" }} color="#D9D9D9">
                <InfoOutlined style={{ marginLeft: -4, marginRight: 3 }} />
              </Tag>
            </Popover>
          </span>
        )
      case "channel_crash":
        return (
          <Tag style={styles.tag} color="#D9D9D9">
            <CloseOutlined style={{ fontSize: 16, marginRight: 3, position: 'relative', top: 1.5 }} />
            {row.frame_up}
          </Tag>
        )
      case "channel_start_error":
        return (
          <Tag style={styles.tag} color="#D9D9D9">
            <CloseOutlined style={{ fontSize: 16, marginRight: 3, position: 'relative', top: 1.5 }} />
            {row.frame_up}
          </Tag>
        )
    }
  }

  render() {
    const { rows } = this.state

    const columns = [
      {
        dataIndex: 'category',
        render: data => <Text>{categoryTag(data)}</Text>
      },
      {
        title: 'Frame Count',
        dataIndex: 'frame_up',
        render: (data, row) => this.renderFrameIcons(row)
      },
      {
        title: 'Port',
        dataIndex: 'port',
      },
      {
        title: 'Dev Address',
        dataIndex: 'devaddr',
      },
      {
        title: 'Time',
        dataIndex: 'reported_at',
        align: 'left',
        render: data => <Text style={{textAlign:'left'}}>{formatUnixDatetime(data)}</Text>
      },
    ]

    const { loading, error } = this.props.data

    if (loading) return null;
    if (error) return (
      <Text>Data failed to load, please reload the page and try again</Text>
    )

    return(
      <React.Fragment>
        <div style={{padding: 20}}>
          <div className="chart-legend-bulb red"></div>
          <Text>
            Live Data
          </Text>
        </div>
        <div style={{padding: 20, boxSizing: 'border-box'}}>
        <PacketGraph events={this.state.rows} />
        </div>
        <div style={{padding: 20, width: '100%', background: '#F6F8FA', borderBottom: '1px solid #e1e4e8', borderTop: '1px solid #e1e4e8'}}>
        <Text strong style={{display: 'block', fontSize: 19, color: 'rgba(0, 0, 0, 0.85)'}}>
          Event Log
        </Text>
        </div>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey={record => record.id}
          pagination={false}
          expandedRowRender={this.renderExpanded}
        />
      </React.Fragment>
    )
  }
}

export default EventsDashboard
